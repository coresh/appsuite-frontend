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

define('io.ox/files/toolbar', [
    'io.ox/core/extensions',
    'io.ox/backbone/mini-views/dropdown',
    'io.ox/backbone/views/toolbar',
    'io.ox/core/notifications',
    'gettext!io.ox/files',
    'io.ox/files/api',
    'io.ox/core/folder/api',
    'io.ox/files/actions',
    'less!io.ox/files/style'
], function (ext, Dropdown, ToolbarView, notifications, gt, api, folderApi) {

    'use strict';

    // define links for classic toolbar
    var point = ext.point('io.ox/files/toolbar/links'),

        meta = {
            //
            // --- HI ----
            //
            'create': {
                prio: 'hi',
                mobile: 'hi',
                title: gt('New'),
                dropdown: 'io.ox/files/toolbar/new'
            },
            'edit': {
                prio: 'hi',
                mobile: 'lo',
                title: gt('Edit'),
                ref: 'io.ox/files/actions/editor'
            },
            'share': {
                prio: 'hi',
                mobile: 'lo',
                icon: 'fa fa-user-plus',
                title: gt('Share'),
                dropdown: 'io.ox/files/toolbar/share'
            },
            'viewer': {
                prio: 'hi',
                mobile: 'lo',
                icon: 'fa fa-eye',
                title: gt('View'),
                ref: 'io.ox/files/actions/viewer'
            },
            'download': {
                prio: 'hi',
                mobile: 'lo',
                icon: 'fa fa-download',
                title: gt('Download'),
                ref: 'io.ox/files/actions/download'
            },
            'download-folder': {
                prio: 'hi',
                mobile: 'lo',
                icon: 'fa fa-download',
                title: gt('Download'),
                ref: 'io.ox/files/actions/download-folder'
            },
            'delete': {
                prio: 'hi',
                mobile: 'lo',
                icon: 'fa fa-trash-o',
                title: gt('Delete'),
                ref: 'io.ox/files/actions/delete'
            },
            'back': {
                prio: 'lo',
                mobile: 'hi',
                label: gt('Folders'),
                ref: 'io.ox/files/favorite/back'
            },
            //
            // --- LO ----
            //
            'addToFavorites': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Add to favorites'),
                ref: 'io.ox/files/actions/favorites/add',
                section: 'favorites'
            },
            'removeFromFavorites': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Remove from favorites'),
                ref: 'io.ox/files/actions/favorites/remove',
                section: 'favorites'
            },
            'rename': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Rename'),
                ref: 'io.ox/files/actions/rename',
                section: 'edit'
            },
            'edit-description': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Edit description'),
                ref: 'io.ox/files/actions/edit-description',
                section: 'edit'
            },
            'save-as-pdf': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Save as PDF'),
                ref: 'io.ox/files/actions/save-as-pdf',
                section: 'save-as'
            },
            'send': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Send by email'),
                ref: 'io.ox/files/actions/send',
                section: 'share'
            },
            'add-to-portal': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Add to portal'),
                ref: 'io.ox/files/actions/add-to-portal',
                section: 'share'
            },
            'move': {
                title: gt('Move'),
                prio: 'lo',
                mobile: 'lo',
                ref: 'io.ox/files/actions/move',
                section: 'file-op'
            },
            'copy': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Copy'),
                ref: 'io.ox/files/actions/copy',
                section: 'file-op'
            },
            'lock': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Lock'),
                ref: 'io.ox/files/actions/lock',
                section: 'file-op'
            },
            'unlock': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Unlock'),
                ref: 'io.ox/files/actions/unlock',
                section: 'file-op'
            },
            'restore': {
                prio: 'lo',
                mobile: 'lo',
                title: gt('Restore'),
                ref: 'io.ox/files/actions/restore',
                section: 'file-op'
            }
        };

    // transform into extensions

    var index = 0;

    _(meta).each(function (extension, id) {
        extension.id = id;
        extension.index = (index += 100);
        point.extend(extension);
    });

    // view dropdown
    ext.point('io.ox/files/toolbar/links').extend({
        id: 'view-dropdown',
        index: 10000,
        custom: true,
        draw: function (baton) {

            if (_.device('smartphone')) return;

            //#. View is used as a noun in the toolbar. Clicking the button opens a popup with options related to the View
            var dropdown = new Dropdown({ el: this, model: baton.app.props, label: gt('View'), caret: true })
                .group(gt('Layout'))
                .option('layout', 'list', gt('List'), { group: true })
                .option('layout', 'icon', gt('Icons'), { group: true })
                .option('layout', 'tile', gt('Tiles'), { group: true })
                .divider()
                .group(gt('Options'))
                .option('checkboxes', true, gt('Checkboxes'), { group: true })
                .option('folderview', true, gt('Folder view'), { group: true });

            if (_.device('!touch')) dropdown.option('details', true, gt('File details'), { group: true });

            dropdown.render().$el.addClass('dropdown pull-right').attr('data-dropdown', 'view');
        }
    });

    ext.point('io.ox/files/mediator').extend({
        id: 'toolbar',
        index: 10000,
        setup: function (app) {

            var toolbarView = new ToolbarView({ point: 'io.ox/files/toolbar/links', title: app.getTitle() });

            app.getWindow().nodes.body.addClass('classic-toolbar-visible').prepend(
                toolbarView.$el
            );

            app.updateToolbar = function (selection) {
                toolbarView.setSelection(selection.map(_.cid), function () {
                    return this.getContextualData(selection, 'main');
                }.bind(this));
            };

            app.forceUpdateToolbar = function (selection) {
                toolbarView.selection = null;
                this.updateToolbar(selection);
            };
        }
    });

    ext.point('io.ox/files/mediator').extend({
        id: 'update-toolbar',
        index: 10200,
        setup: function (app) {
            app.updateToolbar(app.listView.selection.get());
            // update toolbar on selection change
            app.listView.on('selection:change', function () {
                app.updateToolbar(app.listView.selection.get());
            });

            // update toolbar on model changes
            app.listView.on('change', _.debounce(function () {
                app.forceUpdateToolbar(app.listView.selection.get());
            }), 10);

            api.on('favorite:add favorite:remove', _.debounce(function () {
                app.forceUpdateToolbar(app.listView.selection.get());
            }), 10);

            folderApi.on('favorite:add favorite:remove', _.debounce(function () {
                app.forceUpdateToolbar(app.listView.selection.get());
            }), 10);

            app.on('folder:change', function () {
                app.forceUpdateToolbar([]);
            });
        }
    });

    ext.point('io.ox/files/mediator').extend({
        id: 'metrics-toolbar',
        index: 10300,
        setup: function (app) {

            require(['io.ox/metrics/main'], function (metrics) {
                if (!metrics.isEnabled()) return;

                var nodes = app.getWindow().nodes,
                    toolbar = nodes.body.find('.classic-toolbar-container');

                // toolbar actions
                toolbar.on('mousedown', '.io-ox-action-link:not(.dropdown-toggle)', function (e) {
                    metrics.trackEvent({
                        app: 'drive',
                        target: 'toolbar',
                        type: 'click',
                        action: $(e.currentTarget).attr('data-action')
                    });
                });
                // toolbar options dropdown
                toolbar.on('mousedown', '.dropdown a:not(.io-ox-action-link)', function (e) {
                    var node =  $(e.target).closest('a'),
                        isToggle = node.attr('data-toggle') === 'true';
                    if (!node.attr('data-name')) return;
                    metrics.trackEvent({
                        app: 'drive',
                        target: 'toolbar',
                        type: 'click',
                        action: node.attr('data-tracking-id') || node.attr('data-name') || node.attr('data-action'),
                        detail: isToggle ? !node.find('.fa-check').length : node.attr('data-value')
                    });
                });
            });
        }
    });
});
