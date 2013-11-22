/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2013 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Julian Bäume <julian.baeume@open-xchange.com>
 */

define('io.ox/wizards/firstStart/main', [
    'io.ox/core/extPatterns/stage',
    'io.ox/core/extensions',
    'settings!io.ox/wizards/firstStart',
    'less!io.ox/wizards/firstStart/style.less'
], function (Stage, ext, settings) {

    'use strict';

    var point = ext.point('io.ox/wizards/firstStart'),
        topbar = $('#io-ox-topbar');

    new Stage('io.ox/core/stages', {
        id: 'firstStartWizard',
        index: 550,
        run: function () {
            if (ox.manifests.pluginsFor('io.ox/wizards/firstStart').length === 0 ||
                settings.get('finished', false)) {
                return $.when();
            }
            var def = $.Deferred();
            topbar.hide();
            ox.idle();
            ox.manifests.loadPluginsFor('io.ox/wizards/firstStart')
                .then(function () {
                    if (point.all().length === 0) {
                        def.resolve();
                        return $.Deferred().reject();
                    }
                    return require(['io.ox/core/wizard/registry']);
                })
                .then(function (registry) {
                    return $.when(
                        registry.getWizard({
                            id: 'io.ox/wizards/firstStart'
                        }),
                        require(['gettext!io.ox/core/wizard'])
                    );
                })
                .then(function (wizard, gt) {
                    wizard.navButtons.append(
                        $('<button class="btn wizard-close">').text(gt('Close')).on('click', function () {
                            def.reject();
                            wizard.close();
                        })
                     );
                    wizard.start({cssClass: 'first-start-wizard'}).done(function () {
                        if (def.state() === 'pending') {
                            def.resolve();
                        }
                    });
                    return def;
                })
                .done(function () {
                    settings.set({finished: true}).save();
                    topbar.show();
                    ox.busy();
                })
                .fail(function () {
                    require('io.ox/core/main').logout();
                });

            return def;
        }
    });

    return {
    };
});
