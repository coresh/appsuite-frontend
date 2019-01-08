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
 * @author David Bauer <david.bauer@open-xchange.com>
 */

define('io.ox/mail/compose/main', [
    'io.ox/core/extensions',
    'io.ox/mail/compose/api',
    'io.ox/mail/api',
    'io.ox/core/api/account',
    'io.ox/mail/util',
    'settings!io.ox/mail',
    'gettext!io.ox/mail'
], function (ext, composeAPI, mailAPI, accountAPI, mailUtil, settings, gt) {

    'use strict';

    // via point.cascade

    ext.point('io.ox/mail/compose/boot').extend({
        id: 'bundle',
        index: 100,
        perform: function () {
            return require(['io.ox/mail/compose/bundle']);
        }
    }, {
        id: 'compose-model',
        index: 200,
        perform: function (baton) {
            var self = this;

            // already has a model. e.g. when opened via restorepoint
            if (baton.model) {
                this.model = baton.model;
                return this.model.initialized;
            }

            return require(['io.ox/mail/compose/model']).then(function (MailComposeModel) {
                self.model = baton.model = new MailComposeModel(baton.data);
                return self.model.initialized;
            });
        }
    }, {
        id: 'compose-view',
        index: 300,
        perform: function (baton) {
            var self = this;
            return require(['io.ox/mail/compose/config', 'io.ox/mail/compose/view']).then(function (MailComposeConfig, MailComposeView) {
                self.config = new MailComposeConfig({ app: self });
                self.view = baton.view = new MailComposeView({ app: self, model: self.model, config: self.config });
            });
        }
    }, {
        id: 'fix-from',
        index: 400,
        perform: function () {
            var model = this.model;
            // TODO: should be handle by middleware
            if (model.get('from')) return;
            accountAPI.getPrimaryAddressFromFolder(model.get('meta').originalFolderId).then(function (address) {
                // ensure defaultName is set (bug 56342)
                settings.set(['customDisplayNames', address[1], 'defaultName'], address[0]);
                // custom display names
                if (settings.get(['customDisplayNames', address[1], 'overwrite'])) {
                    address[0] = settings.get(['customDisplayNames', address[1], 'name'], '');
                }
                if (!settings.get('sendDisplayName', true)) {
                    address[0] = null;
                }
                model.set('from', address);
            });
        }
    }, {
        id: 'fix-displayname',
        index: 500,
        perform: function () {
            var model = this.model,
                config = this.config;

            // TODO: check senderView scenarios
            // TODO listeners never gets removed
            updateDisplayName();
            config.on('change:sendDisplayName', updateDisplayName);
            ox.on('change:customDisplayNames', updateDisplayName);

            // fix current value
            function updateDisplayName() {
                var from = model.get('from');
                if (!from) return;
                model.set('from', mailUtil.getSender(from, config.get('sendDisplayName')));
            }
        }
    }, {
        id: 'render-view',
        index: 600,
        perform: function (baton) {
            var win = baton.win;
            win.nodes.main.addClass('scrollable').append(this.view.render().$el);
        }
    }, {
        id: 'editor-mode',
        index: 700,
        perform: function () {
            // map 'alternative'
            var isAlternative = this.config.get('preferredEditorMode') === 'alternative' || this.config.get('editorMode') === 'alternative';
            if (!isAlternative) return;
            this.config.set('editorMode', this.model.get('content_type') === 'text/plain' ? 'text' : 'html', { silent: true });
        }
    }, {
        id: 'auto-bcc',
        index: 800,
        perform: function () {
            if (!settings.get('autobcc') || this.config.get('mode') === 'edit') return;
            this.model.set('bcc', mailUtil.parseRecipients(settings.get('autobcc'), { localpart: false }));
        }
    }, {
        id: 'auto-discard',
        index: 900,
        perform: function () {
            // disable auto remove on discard for draft mails
            this.config.set('autoDiscard', this.config.get('mode') !== 'edit');
        }
    }, {
        id: 'set-mail',
        index: 1000,
        perform: function () {
            return this.view.setMail();
        }
    }, {
        id: 'initial-signature',
        index: 1100,
        perform: function () {
            if (_.device('smartphone')) return;
            return this.view.signaturesLoading.then(function () {
                this.config.setInitialSignature();
            }.bind(this));
        }
    }, {
        id: 'finally',
        index: 1200,
        perform: function (baton) {
            var win = baton.win;
            // calculate right margin for to field (some languages like chinese need extra space for cc bcc fields)
            win.nodes.main.find('.tokenfield').css('padding-right', 14 + win.nodes.main.find('.recipient-actions').width() + win.nodes.main.find('[data-extension-id="to"] .has-picker').length * 20);
            // Set window and toolbars visible again
            win.nodes.header.removeClass('sr-only');
            win.nodes.body.removeClass('sr-only').find('.scrollable').scrollTop(0);
            win.idle();
            $(window).trigger('resize');  // Needed for proper initial resizing in editors
            win.setTitle(this.model.get('subject') || gt('Compose'));
            this.view.dirty(false);
        }
    });

    // multi instance pattern
    function createInstance() {

        // application object
        var app = ox.ui.createApp({
                name: 'io.ox/mail/compose',
                title: gt('Compose'),
                userContent: true,
                closable: true,
                floating: !_.device('smartphone'),
                size: 'width-xs height-md'
            }),
            win;

        app.setLauncher(function () {
            // get window
            app.setWindow(win = ox.ui.createWindow({
                name: 'io.ox/mail/compose',
                chromeless: true,
                // attributes for the floating window
                floating: !_.device('smartphone'),
                closable: true,
                title: gt('Compose')
            }));
        });

        app.failRestore = function (point) {
            return require(['io.ox/mail/compose/bundle']).then(function () {
                return require(['io.ox/mail/compose/model']);
            }).then(function (MailComposeModel) {
                var model = new MailComposeModel({ id: point });
                return app.open({}, model);
            });
        };

        app.getContextualHelp = function () {
            return 'ox.appsuite.user.sect.email.gui.create.html';
        };

        app.open = function (obj, model) {
            var def = $.Deferred();
            obj = _.extend({ meta: { type: 'new' } }, obj);

            // Set window and toolbars invisible initially
            win.nodes.header.addClass('sr-only');
            win.nodes.body.addClass('sr-only');

            win.busy().show(function () {

                ext.point('io.ox/mail/compose/boot').cascade(app, { data: obj || {}, model: model, win: win }).then(function success() {
                    def.resolve({ app: app });
                    ox.trigger('mail:' + app.model.get('meta').type + ':ready', obj, app);
                }, function fail(e) {
                    require(['io.ox/core/notifications'], function (notifications) {
                        notifications.yell(e);
                        if (app.view) {
                            app.view.dirty(false);
                            app.view.removeLogoutPoint();
                        }
                        app.quit();

                        def.reject(e);
                    });
                });
            });

            return def;
        };

        // destroy
        app.setQuit(function () {
            if (app.view) return app.view.discard();
        });

        // after view is detroyed
        app.on('quit', function () {
            if (app.model) app.model.destroy();
        });

        // for debugging purposes
        window.compose = app;

        return app;
    }

    return {

        getApp: createInstance,

        reuse: function () {
            // disable reuse since a floating window is never reused
            return false;
        }
    };
});
