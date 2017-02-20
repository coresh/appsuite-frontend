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
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 */
define('io.ox/oauth/settings', [
    'io.ox/core/extensions',
    'io.ox/oauth/keychain',
    'io.ox/oauth/backbone',
    'io.ox/backbone/mini-views/common',
    'io.ox/backbone/mini-views/settings-list-view',
    'io.ox/settings/accounts/views',
    'io.ox/keychain/api',
    'io.ox/backbone/views/modal',
    'gettext!io.ox/settings'
], function (ext, oauthKeychain, OAuth, MiniViews, ListView, AccountViews, keychain, ModalDialog, gt) {

    'use strict';

    var accountTypeAppMapping = {
        mail: gt.pgettext('app', 'Mail'),
        fileStorage: gt.pgettext('app', 'Drive')
    };

    function OAuthAccountDetailExtension(serviceId) {
        this.id = serviceId;

        this.draw = function (args) {
            var account = oauthKeychain.accounts.get(args.data.id),
                collection = new Backbone.Collection();

            account.fetchRelatedAccounts().then(function (accounts) {
                collection.push(accounts);
            });

            new ModalDialog({
                async: true,
                title: account.get('displayName'),
                point: 'io.ox/settings/accounts/' + serviceId + '/settings/detail/dialog',
                relatedAccountsCollection: collection,
                account: account,
                service: oauthKeychain.services.withShortId(serviceId),
                parentAccount: args.data.model
            })
            .extend({
                title: function () {
                    var header = this.$el.find('.modal-header'),
                        shortId = this.options.service.id.match(/\.?(\w*)$/)[1] || 'fallback';
                    this.$el.addClass('oauth-account');
                    if (this.options.account.has('identity')) {
                        header.find('.modal-title').append(
                            $('<div class="account-identity">').text(this.options.account.get('identity'))
                        );
                    }
                    header.append(
                        $('<div class="service-icon">').addClass('logo-' + shortId)
                    );
                },
                text: function () {
                    var guid,
                        relatedAccountsView = new ListView({
                            tagName: 'ul',
                            childView: AccountViews.ListItem.extend({
                                getTitle: function () {
                                    var customTitle = accountTypeAppMapping[this.model.get('accountType')];
                                    // fall back to default implementation if we can not figure out a custom title
                                    return customTitle || AccountViews.ListItem.prototype.getTitle.apply(this);
                                }
                            }),
                            collection: this.options.relatedAccountsCollection
                        });
                    this.$body.append(
                        $('<div class="form-group">').append(
                            $('<label>', { 'for': guid = _.uniqueId('input') }).text(gt('Account Name')),
                            new MiniViews.InputView({ name: 'displayName', model: this.options.account, id: guid }).render().$el
                        ),
                        $('<div class="form-group">').append(
                            relatedAccountsView.render().$el
                        )
                    );
                }
            })
            .addCancelButton()
            .addButton({
                action: 'save',
                label: gt('Save')
            })
            .addAlternativeButton({
                action: 'reauthorize',
                label: gt('Reauthorize')
            })
            .on('reauthorize', function () {
                this.options.account.reauthorize();
                // reauthorization is always independent, because it kicks of an external process and we don't always get a response
                // however, there might be unsaved changes to the model, so do not close the dialog, yet.
                this.idle();
            })
            .on('save', function () {
                var dialog = this,
                    account = this.options.account,
                    parentAccount = this.options.parentAccount;
                account.save().then(function () {
                    parentAccount.set(account.attributes);
                    dialog.close();
                }, function () {
                    dialog.idle();
                });
            })
            .open();
        };

        this.renderSubtitle = function (model) {
            var account = oauthKeychain.accounts.get(model.get('id')),
                $el = this;
            if (!account) return;

            account.fetchRelatedAccounts().then(function (accounts) {
                $el.append(accounts.map(function (a) {
                    var mapping = accountTypeAppMapping[a.accountType];
                    return mapping || a.displayName;
                }).join(', '));
            });
        };
    }

    _(oauthKeychain.serviceIDs).each(function (serviceId) {
        ext.point('io.ox/settings/accounts/' + serviceId + '/settings/detail').extend(new OAuthAccountDetailExtension(serviceId));
    });

    ext.point('io.ox/settings/accounts/fileStorage/settings/detail').extend({
        id: 'fileStorage',
        draw: function (args) {
            new ModalDialog({
                async: true,
                title: args.data.model.get('displayName'),
                point: 'io.ox/settings/accounts/fileStorage/settings/detail/dialog',
                account: args.data.model
            })
            .extend({
                text: function () {
                    var account = this.options.account,
                        guid = _.uniqueId('input');
                    this.$body.append(
                        $('<div class="form-group">').append(
                            $('<label>', { 'for': guid }).text(gt('Folder name')),
                            new MiniViews.InputView({ name: 'displayName', model: account, id: guid }).render().$el
                        )
                    );
                }
            })
            .addCancelButton()
            .addButton({
                action: 'save',
                label: gt('Save')
            })
            .on('save', function () {
                var dialog = this,
                    account = this.options.account;
                require(['io.ox/core/api/filestorage']).then(function (fsAPI) {
                    return fsAPI.updateAccount(account.toJSON());
                }).then(function () {
                    dialog.close();
                }, function () {
                    dialog.idle();
                });
            })
            .open();
        }
    });

    return {};
});
