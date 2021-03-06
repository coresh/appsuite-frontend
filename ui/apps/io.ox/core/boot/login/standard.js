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

define('io.ox/core/boot/login/standard', [
    'io.ox/core/boot/util',
    'io.ox/core/boot/locale',
    'io.ox/core/session'
], function (util, locale, session) {

    'use strict';

    return function (e) {

        // stop unless iOS
        e.preventDefault();

        // get user name / password
        var username = $('#io-ox-login-username').val(),
            password = $('#io-ox-login-password').val(),
            form = $(this);

        // be busy
        util.lock();

        // user name and password shouldn't be empty
        if ($.trim(username).length === 0 && !util.isAnonymous()) {
            return util.fail({ error: util.gt('Please enter your credentials.'), code: 'UI-0001' }, 'username');
        }
        if ($.trim(password).length === 0 && !util.isContinue()) {
            return util.fail({ error: util.gt('Please enter your password.'), code: 'UI-0002' }, 'password');
        }

        login(username, password).then(
            function success(data) {
                // don't respond to submit any more
                form.off('submit');
                // store credentials
                if (!util.isAnonymous()) storeCredentials(form);
                // clear URL hash
                _.url.hash({
                    autologout: null,
                    share: null,
                    target: null,
                    login_type: null,
                    message: null,
                    message_type: null,
                    token: null
                });
                // deep-link?
                if (data.module && data.folder) {
                    _.url.hash({ app: 'io.ox/' + data.module, folder: data.folder, id: data.item || null });
                }
                // success
                ox.trigger('login:success', data);
            },
            function (err) {
                util.fail(err);
            }
        );
    };

    function login(name, password) {
        var options = {
            name: name,
            password: password,
            staySignedIn: $('#io-ox-login-store-box').prop('checked'),
            // temporary locale for error messages
            locale: locale.getCurrentLocale(),
            // permanent locale change!?
            forceLocale: locale.getSelectedLocale()
        };

        if (_.url.hash('login_type') && _.url.hash('share') && _.url.hash('target')) {
            var action = 'guest';
            if (util.isAnonymous()) {
                action = 'anonymous';
            }
            _.extend(options, {
                action: action,
                // share-specific data
                share: _.url.hash('share'),
                target: _.url.hash('target')
            });
        }

        return session.login(options);
    }

    // post form into iframe to store username and password
    function storeCredentials(form) {
        var location = window.location.pathname.replace(/[^/]+$/, '') + 'busy.html'; // blank does not work in chrome
        util.debug('Store credentials', location);
        form.find('input[name="location"]').val(location).prop('disabled', false);
        form.attr('target', 'store-credentials').submit();
    }

});
