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
 * @author Mario Scheliga <mario.scheliga@open-xchange.com>
 * @author Julian Bäume <julian.baeume@open-xchange.com>
 */

define('io.ox/settings/accounts/views', [
    'io.ox/core/extensions',
    'io.ox/core/api/account',
    'io.ox/core/api/filestorage',
    'io.ox/core/folder/api',
    'io.ox/settings/util',
    'io.ox/backbone/mini-views/listutils',
    'io.ox/backbone/disposable',
    'gettext!io.ox/settings/accounts'
], function (ext, accounts, filestorageApi, folderAPI, settingsUtil, listUtils, DisposableView, gt) {
    'use strict';

    var createExtpointForSelectedAccount = function (args) {
            if (args.data.id !== undefined && args.data.accountType !== undefined) {
                ext.point('io.ox/settings/accounts/' + args.data.accountType + '/settings/detail').invoke('draw', args.data.node, args);
            }
        },
        drawIcon = (function () {
            return function (model) {
                var type = model.get('accountType'),
                    shortId = String(model.get('serviceId') || model.id).match(/\.?([a-zA-Z]*)(\d*)$/)[1] || 'fallback';
                return $('<i class="account-icon fa" aria-hidden="true">')
                    .addClass(type.toLowerCase())
                    .addClass('logo-' + shortId);
            };
        })(),

        /**
         * getAccountState
         * Used to display a possible error message
         * in a DSC environment. Returns a jQuery node
         * containing the error. Will not be used in
         * non-dsc setups (atm)
         */
        drawAccountState = function (model) {
            if ((typeof model.get('status') === 'undefined') || model.get('status') === 'ok') return;

            return $('<div class="error-wrapper">').append(
                $('<i class="error-icon fa fa-exclamation-triangle" aria-hidden="true">'),
                $('<div class="error-message">').text(model.get('status').message)
            );
        },
        SettingsAccountListItemView = DisposableView.extend({

            tagName: 'li',

            className: 'settings-list-item',

            events: {
                'click [data-action="edit"]': 'onEdit',
                'click [data-action="delete"]': 'onDelete'
            },

            initialize: function () {
                this.listenTo(this.model, 'change', this.render);
            },

            getTitle: function () {
                // mail accounts are special, displayName might be different from account name, want account name, here
                var titleAttribute = this.model.get('accountType') === 'mail' ? 'name' : 'displayName';

                return this.model.get(titleAttribute);
            },

            renderSubTitle: function () {
                var el = $('<div class="list-item-subtitle">');
                ext.point('io.ox/settings/accounts/' + this.model.get('accountType') + '/settings/detail').invoke('renderSubtitle', el, this.model);
                return el;
            },

            render: function () {
                var self = this,
                    title = self.getTitle();
                self.$el.attr({
                    'data-id': self.model.get('id'),
                    'data-accounttype': self.model.get('accountType')
                });

                self.$el.empty().append(
                    drawIcon(self.model),
                    listUtils.makeTitle(title).append(
                        this.renderSubTitle()
                    ),
                    listUtils.makeControls().append(
                        listUtils.appendIconText(
                            listUtils.controlsEdit({ 'aria-label': gt('Edit %1$s', title) }),
                            gt('Edit'),
                            'edit'
                        ),
                        self.model.get('id') !== 0 ? listUtils.controlsDelete({ title: gt('Delete %1$s', title) }) : $('<div class="remove-placeholder">')
                    ),
                    drawAccountState(this.model) // show a possible account error
                );

                return self;
            },

            onDelete: function (e) {

                e.preventDefault();

                var account = { id: this.model.get('id'), accountType: this.model.get('accountType') },
                    self = this;

                if (account.accountType === 'fileStorage') {
                    account.filestorageService = this.model.get('filestorageService');
                }

                require(['io.ox/backbone/views/modal'], function (ModalDialog) {
                    new ModalDialog({
                        async: true,
                        title: gt('Delete account')
                    })
                    .build(function () {
                        this.$body.append(gt('Do you really want to delete this account?'));
                    })
                    .addCancelButton()
                    .addButton({ action: 'delete', label: gt('Delete account') })
                    .on('delete', function () {
                        var popup = this,
                            // require correct api
                            req = account.accountType === 'fileStorage' ? 'io.ox/core/api/filestorage' : 'io.ox/keychain/api';
                        settingsUtil.yellOnReject(
                            require([req]).then(function (api) {
                                return api.remove(account);
                            }).then(
                                function success() {
                                    folderAPI.list('1', { cache: false });
                                    if (self.disposed) {
                                        popup.close();
                                        return;
                                    }

                                    self.model.collection.remove(self.model);
                                    popup.close();
                                },
                                function fail() {
                                    popup.close();
                                    throw arguments;
                                }
                            )
                            .always(function () {
                                // update folder tree
                                require(['io.ox/core/api/account', 'io.ox/core/folder/api'], function (accountAPI, folderAPI) {
                                    accountAPI.getUnifiedInbox().done(function (unifiedInbox) {
                                        if (!unifiedInbox) return;
                                        var prefix = unifiedInbox.split('/')[0];
                                        folderAPI.pool.unfetch(prefix);
                                        folderAPI.refresh();
                                    });
                                });
                            })
                        );
                    })
                    .open();
                });
            },

            onEdit: function (e) {
                e.preventDefault();
                e.data = {
                    id: this.model.get('id'),
                    accountType: this.model.get('accountType'),
                    model: this.model,
                    node: this.el
                };
                createExtpointForSelectedAccount(e);
            }
        });

    return {
        ListItem: SettingsAccountListItemView
    };
});