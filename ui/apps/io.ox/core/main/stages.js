/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2017 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/core/main/stages', [
    'io.ox/core/extensions',
    'io.ox/core/notifications',
    'io.ox/core/capabilities',
    'io.ox/core/api/apps',
    'io.ox/core/folder/api',
    'io.ox/core/main/debug',
    'settings!io.ox/core',
    'settings!io.ox/contacts',
    'gettext!io.ox/core'
], function (ext, notifications, capabilities, appAPI, folderAPI, debug, settings, contactsSettings, gt) {

    var topbar = $('#io-ox-appcontrol');

    var getAutoLaunchDetails = function (str) {
        var pair = (str || '').split(/:/), app = pair[0], method = pair[1] || '';
        return { app: (/\/main$/).test(app) ? app : app + '/main', method: method };
    };

    var mobileAutoLaunchArray = function () {
        var autoStart = _([].concat(settings.get('autoStartMobile', 'io.ox/mail'))).filter(function (o) {
            return !_.isUndefined(o) && !_.isNull(o);
        });
        // add mail as fallback
        if (autoStart[0] !== 'io.ox/mail') autoStart.push('io.ox/mail');
        return autoStart;
    };

    var autoLaunchArray = function () {
        var autoStart = [];

        if (settings.get('autoStart') === 'none') {
            autoStart = [];
        } else {
            var favoritePaths = _(appAPI.getApps()).pluck('path');

            autoStart = _([].concat(settings.get('autoStart'), 'io.ox/mail', favoritePaths))
                .chain()
                .filter(function (o) {
                    if (_.isUndefined(o)) return false;
                    if (_.isNull(o)) return false;
                    // special case to start in settings (see Bug 50987)
                    if (/^io.ox\/settings(\/main)?$/.test(o)) return true;
                    return favoritePaths.indexOf(/main$/.test(o) ? o : o + '/main') >= 0;
                })
                .first(1) // use 1 here to return an array
                .value();
        }

        return autoStart;
    };

    ext.point('io.ox/core/stages').extend({
        id: 'first',
        index: 100,
        run: function () {
            debug('Stage "first"');
        }
    }, {
        id: 'appcheck',
        index: 101,
        run: function (baton) {
            debug('Stage "appcheck"');
            // checks url which app to launch, needed to handle direct links
            //
            var hash = _.url.hash(),
                looksLikeDeepLink = !('!!' in hash),
                usesDetailPage;
            // fix old infostore
            if (hash.m === 'infostore') hash.m = 'files';

            // no id values with id collections 'folder.id,folder.id'
            // no virtual folder
            if (looksLikeDeepLink && hash.app && hash.folder && hash.id && hash.folder.indexOf('virtual/') !== 0 && hash.id.indexOf(',') < 0) {

                // new-school: app + folder + id
                // replace old IDs with a dot by 'folder_id SLASH id'
                var id = /^\d+\./.test(hash.id) ? hash.id.replace(/\./, '/') : hash.id;
                usesDetailPage = /^io.ox\/(mail|contacts|calendar|tasks)$/.test(hash.app);

                _.url.hash({
                    app: usesDetailPage ? hash.app + '/detail' : hash.app,
                    folder: hash.folder,
                    id: id
                });

                baton.isDeepLink = true;

            } else if (hash.m && hash.f && hash.i) {

                // old-school: module + folder + id
                usesDetailPage = /^(mail|contacts|calendar|tasks)$/.test(hash.m);

                _.url.hash({
                    // special treatment for files (viewer + drive app)
                    app: 'io.ox/' + (usesDetailPage ? hash.m + '/detail' : hash.m),
                    folder: hash.f,
                    id: hash.i
                });

                baton.isDeepLink = true;

            } else if (hash.m && hash.f) {

                // just folder
                _.url.hash({
                    app: 'io.ox/' + hash.m,
                    folder: hash.f
                });

                baton.isDeepLink = true;
            }

            // clean up
            _.url.hash({ m: null, f: null, i: null, '!!': undefined, '!': null });

            // always use portal on small devices!
            if (_.device('smartphone')) mobileAutoLaunchArray();

            var appURL = _.url.hash('app'),
                manifest = appURL && ox.manifests.apps[getAutoLaunchDetails(appURL).app],
                deeplink = looksLikeDeepLink && manifest && manifest.deeplink,
                mailto = _.url.hash('mailto') !== undefined && (appURL === ox.registry.get('mail-compose') + ':compose');

            if (manifest && (manifest.refreshable || deeplink)) {
                baton.autoLaunch = appURL.split(/,/);
                // no manifest for mail compose, capabilities check is sufficient
            } else if (capabilities.has('webmail') && mailto) {
                // launch main mail app for mailto links
                baton.autoLaunch = ['io.ox/mail/main'];
            } else {
                // clear typical parameter?
                if (manifest) _.url.hash({ app: null, folder: null, id: null });
                baton.autoLaunch = autoLaunchArray();
            }
        }
    }, {
        id: 'autoLaunchApps',
        index: 102,
        run: function (baton) {
            debug('Stage "autoLaunchApps"');
            baton.autoLaunchApps = _(baton.autoLaunch).chain().map(function (m) {
                return getAutoLaunchDetails(m).app;
            }).filter(function (m) {
                //don’t autoload without manifest
                //don’t autoload disabled apps
                return ox.manifests.apps[m] !== undefined && !ox.manifests.isDisabled(m);
            }).compact().value();
        }
    }, {
        id: 'startLoad',
        index: 103,
        run: function (baton) {
            debug('Stage "startLoad"');
            function fail(type) {
                return function (e) {
                    var message = (e && e.message) || '';
                    console.error('core: Failed to load:', type, message, e, baton);
                    throw e;
                };
            }

            baton.loaded = $.when(
                ext.loadPlugins().fail(fail('loadPlugins')),
                require(baton.autoLaunchApps).fail(fail('autoLaunchApps')),
                require(['io.ox/core/api/account']).then(
                    function (api) {
                        var def = $.Deferred();
                        api.all().always(def.resolve);
                        return def;
                    },
                    fail('account')
                )
            );
        }
    }, {
        id: 'secretCheck',
        index: 250,
        run: function () {
            debug('Stage "secretCheck"');
            if (ox.online && ox.rampup && ox.rampup.oauth) {
                var analysis = ox.rampup.oauth.secretCheck;
                if (analysis && !analysis.secretWorks) {
                    // Show dialog
                    require(['io.ox/keychain/secretRecoveryDialog'], function (d) { d.show(); });
                    if (ox.debug) {
                        console.error('Couldn\'t decrypt accounts: ', analysis.diagnosis);
                    }
                }
            }
        }
    }, {
        id: 'drawDesktop',
        index: 500,
        run: function () {
            ext.point('io.ox/core/desktop').invoke('draw', $('#io-ox-desktop'), {});
        }
    }, {
        id: 'load',
        index: 600,
        run: function (baton) {
            debug('Stage "load"', baton);

            return baton.loaded;
        }
    }, {
        id: 'topbars',
        index: 610,
        run: function () {

            debug('Stage "load" > loaded.done');

            ext.point('io.ox/core/appcontrol').invoke('draw');

            if (_.device('smartphone')) {
                ext.point('io.ox/core/mobile').invoke('draw');
                //$('#io-ox-screens').css('top', '40px');
            }

            // help here
            if (!ext.point('io.ox/core/topbar').isEnabled('default')) {
                $('#io-ox-screens').css('top', '0px');
                topbar.hide();
            }
            //draw plugins
            ext.point('io.ox/core/plugins').invoke('draw');

            debug('Stage "load" > autoLaunch ...');

            // restore apps
            return ox.ui.App.restore();
        }
    }, {
        id: 'restoreLaunch',
        index: 620,
        run: function (baton) {

            // store hash now or restored apps might have changed url
            var hash = _.copy(_.url.hash());

            // is set false, if no autoLaunch is available.
            // for example if default app is 'none' (see Bug 51207) or app is restored (see Bug Bug 51211)
            var allUnavailable = baton.autoLaunch.length > 0;
            // auto launch
            _(baton.autoLaunch)
            .chain()
            .map(function (id) {
                return getAutoLaunchDetails(id);
            })
            .filter(function (details) {
                //don’t autoload without manifest
                //don’t autoload disabled apps
                return ox.manifests.apps[details.app] !== undefined && !ox.manifests.isDisabled(details.app);
            })
            .each(function (details, index) {
                //only load first app on small devices
                if (index === 0) allUnavailable = false;
                if (_.device('smartphone') && index > 0) return;
                // split app/call
                var launch, method, options = _(hash).pick('folder', 'id');
                debug('Auto launch:', details.app, options);
                launch = ox.launch(details.app, options);
                method = details.method;
                // TODO: all pretty hard-wired here; looks for better solution
                // special case: open viewer too?
                if (hash.app === 'io.ox/files' && hash.id !== undefined) {
                    require(['io.ox/core/viewer/main', 'io.ox/files/api'], function (Viewer, api) {
                        folderAPI.get(hash.folder)
                            .done(function () {
                                api.get(hash).done(function (data) {
                                    new Viewer().launch({ files: [data], folder: hash.folder });
                                });
                            })
                            .fail(function (error) {
                                _.url.hash('id', null);
                                notifications.yell(error);
                            });
                    });
                }
                // explicit call?
                if (method) {
                    launch.done(function () {
                        if (_.isFunction(this[method])) {
                            this[method]();
                        }
                    });
                }
                // non-app deeplinks
                var id = _.url.hash('reg'),
                    // be case insensitive
                    showFeedback = _(_.url.hash()).reduce(function (memo, value, key) {
                        if (key.toLowerCase() === 'showfeedbackdialog') {
                            return value;
                        }
                        return memo;
                    });

                if (id && ox.registry.get(id)) {
                    // normalise args
                    var list = (_.url.hash('regopt') || '').split(','),
                        data = {}, parts;
                    // key:value, key:value... -> object
                    _.each(list, function (str) {
                        parts = str.split(':');
                        data[parts[0]] = parts[1];
                    });
                    // call after app is ready
                    launch.done(function () {
                        ox.registry.call(id, 'client-onboarding', { data: data });
                    });
                }

                if (showFeedback === 'true' && capabilities.has('feedback')) {
                    launch.done(function () {
                        require(['plugins/core/feedback/register'], function (feedback) {
                            feedback.show();
                        });
                    });
                }

                if (contactsSettings.get('features/furigana', false)) {
                    require(['l10n/ja_JP/io.ox/register']);
                }
            });
            if (allUnavailable || (ox.rampup && ox.rampup.errors)) {
                var message = _.pluck(ox.rampup.errors, 'error').join('\n\n');
                message = message || gt('The requested application is not available at this moment.');
                notifications.yell({ type: 'error', error: message, duration: -1 });
            }
        }
    }, {
        id: 'curtain',
        index: 700,
        run: function () {
            debug('Stage "curtain"');

            var def = $.Deferred();
            $('#background-loader').idle().fadeOut(250, def.resolve);
            return def;
        }
    }, {
        id: 'ready',
        index: 1000000000000,
        run: function () {
            debug('DONE!');
            ox.trigger('core:ready');
        }
    });
});