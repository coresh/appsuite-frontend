/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2016 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/core/session', [
    'io.ox/core/http',
    'io.ox/core/manifests',
    'io.ox/core/uuids',
    'io.ox/core/boot/config',
    'io.ox/core/locale/meta'
], function (http, manifests, uuids, config, meta) {

    'use strict';

    var TIMEOUTS = { AUTOLOGIN: 7000, LOGIN: 10000, FETCHCONFIG: 2000 },
        CLIENT = 'open-xchange-appsuite',
        isAutoLogin = false;

    var set = function (data, locale) {
        if ('session' in data) ox.session = data.session || '';
        // might have a domain; depends on what the user entered on login
        if ('user' in data) ox.user = data.user || '';
        if ('user_id' in data) ox.user_id = data.user_id || 0;
        if ('context_id' in data) ox.context_id = data.context_id || 0;
        // if the user has set the language on the login page, use this language instead of server settings lang
        ox.locale = locale || data.locale || meta.getValidDefaultLocale();
        _.setCookie('locale', ox.locale);
        manifests.reset();
        $('html').attr('lang', ox.locale.split('_')[0]);
        ox.trigger('change:session', ox.session);
    };

    var that = {

        set: set,

        autoLogin: function () {

            // Fetches the timeout value in parallel with the main HTTP request
            // if it takes too long. Falls back to values in TIMEOUTS if
            // fetching the config also takes too long.
            function withTimeout(httpCall, options) {
                var start = _.now(),
                    // Variables used for synchronization:
                    // configTimer fetches the serverConfig,
                    configTimer = setTimeout(fetchConfig, TIMEOUTS.FETCHCONFIG),
                    // xhrTimer aborts the HTTP request on timeout,
                    xhrTimer = setTimeout(abort, TIMEOUTS.AUTOLOGIN),
                    // xhr cancels the timers on completion.
                    xhr = httpCall(options);

                // Cancel the timers if the HTTP request is finished before
                // the timeout.
                return xhr.always(function () {
                    if (configTimer !== null) {
                        clearTimeout(configTimer);
                        configTimer = null;
                    }
                    if (xhrTimer !== null) {
                        clearTimeout(xhrTimer);
                        xhrTimer = null;
                    }
                });

                // Fetch serverConfig manually if the request takes too long.
                function fetchConfig() {
                    configTimer = null;
                    config.server().done(function (conf) {
                        if (xhrTimer === null) return; // too late
                        if (!conf || !conf.autoLoginTimeout) return; // use default

                        // Restart the abort timer with the configured value,
                        // adjusting for already elapsed time.
                        clearTimeout(xhrTimer);
                        xhrTimer = setTimeout(abort, Math.max(0,
                            conf.autoLoginTimeout - (_.now() - start)));
                    });
                }

                // Abort the HTTP request.
                function abort() {
                    xhrTimer = null;
                    xhr.abort();
                }
            }

            // GET request
            return (
                _.url.hash('token.autologin') === 'false' && _.url.hash('serverToken')
                    // no auto-login for server-token-based logins
                    ? $.Deferred().reject({})
                    // try auto-login
                    : withTimeout(http.GET, {
                        module: 'login',
                        appendColumns: false,
                        appendSession: false,
                        processResponse: false,
                        params: {
                            action: 'autologin',
                            client: that.client(),
                            rampup: true,
                            rampUpFor: CLIENT,
                            version: that.version()
                        }
                    })
            )
            .then(
                function success(data) {
                    ox.secretCookie = true;
                    ox.rampup = data.rampup || ox.rampup || {};
                    isAutoLogin = true;
                    return data;
                },
                // If autologin fails, try token login
                function fail(data) {
                    if (!_.url.hash('serverToken')) throw (data || {});
                    return withTimeout(http.POST, {
                        module: 'login',
                        jsessionid: _.url.hash('jsessionid'),
                        appendColumns: false,
                        appendSession: false,
                        processResponse: false,
                        data: {
                            action: 'tokens',
                            client: that.client(),
                            version: that.version(),
                            serverToken: _.url.hash('serverToken'),
                            clientToken: _.url.hash('clientToken'),
                            rampup: true,
                            rampUpFor: CLIENT
                        }
                    })
                    .then(function (response) {
                        // make sure we have rampupdata
                        if (response.data.rampup) {
                            return response.data;
                        }
                        //session needed for rampup call
                        ox.session = response.data.session;
                        return that.rampup().then(function (rampupData) {
                            response.data.rampup = rampupData;
                            return response.data;
                        });
                    });
                }
            )
            .then(function (data) {
                set(data);
                // global event
                ox.trigger('login', data);
                return data;
            })
            .done(function () {
                _.url.hash({
                    jsessionid: null,
                    serverToken: null,
                    clientToken: null,
                    'token.autologin': null
                });
            });
        },

        login: (function () {

            var pending = null;

            return function (options) {

                if (!ox.online) {
                    // don't try when offline
                    set({ session: 'offline', user: options.username }, options.locale);
                    return $.when({ session: ox.session, user: ox.user });
                }

                // pending?
                if (pending !== null) return pending;
                var params = _.extend(
                    {
                        action: 'login',
                        name: '',
                        password: '',
                        // current browser locale; required for proper error messages
                        locale: 'en_US',
                        client: that.client(),
                        version: that.version(),
                        timeout: TIMEOUTS.LOGIN,
                        rampup: true,
                        rampUpFor: 'open-xchange-appsuite'
                    },
                    _(options).pick('action', 'name', 'password', 'locale', 'rampup', 'rampUpFor', 'share', 'target', 'secret_code', 'staySignedIn')
                );

                if (options.forceLocale) params.storeLocale = true;

                return (
                    pending = http.POST({
                        module: 'login',
                        appendColumns: false,
                        appendSession: false,
                        processResponse: false,
                        data: params
                    })
                    .then(
                        function success(data) {
                            // store rampup data
                            ox.rampup = data.rampup || ox.rampup || {};
                            // store session
                            // we pass forceLocale (might be undefined); fallback is data.locale
                            set(data, options.forceLocale);

                            // global event
                            ox.trigger('login', data);
                            ox.secretCookie = !!options.staySignedIn;

                            return data;
                        },
                        function fail(e) {
                            if (ox.debug) console.error('Login failed!', e.error, e.error_desc || '');
                            throw e;
                        }
                    )
                    .always(function () {
                        pending = null;
                    })
                );
            };
        }()),

        rampup: function () {
            return http.GET({
                module: 'login',
                params: {
                    action: 'rampup',
                    rampup: true,
                    rampUpFor: CLIENT
                },
                appendColumns: false,
                processResponse: false
            })
            .then(function (data) {
                return (ox.rampup = data.rampup || ox.rampup || {});
            });
        },

        /*
        redeemToken: function (token) {
            console.warn('WARNING: Redeem-token is deprecated and will be remove in the near future.');
            return http.POST({
                processResponse: false,
                appendSession: false,
                appendColumns: false,
                module: 'login',
                url: 'api/login?action=redeemToken',
                data: {
                    authId: uuids.randomUUID(),
                    token: token,
                    client: 'mobile-notifier',
                    secret: 'notifier-123'
                }
            });
        },*/

        logout: function () {
            if (ox.online) {
                // POST request
                return http.POST({
                    module: 'login',
                    appendColumns: false,
                    processResponse: false,
                    data: {
                        action: 'logout'
                    }
                }).then(function () {
                    ox.trigger('logout');
                });
            }
            return $.Deferred().resolve();
        },

        setClient: function (client) {
            if (client) CLIENT = client;
        },

        client: function () {
            return CLIENT;
        },

        version: function () {
            // need to work with ox.version since we don't have the server config for auto-login
            return String(ox.version).split('.').slice(0, 3).join('.');
        },

        isAutoLogin: function () {
            return isAutoLogin;
        }
    };

    return that;
});
