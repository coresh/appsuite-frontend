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
 * @author Frank Paczynski <frank.paczynski@open-xchange.com>
 */

define('io.ox/mail/categories/mediator', [
    'io.ox/core/capabilities',
    'io.ox/core/extensions',
    'io.ox/mail/categories/api',
    'io.ox/mail/api',
    'io.ox/mail/categories/tabs',
    'io.ox/core/yell',
    'settings!io.ox/mail',
    'gettext!io.ox/mail'
], function (capabilities, ext, api, mailAPI, TabView, yell, settings, gt) {

    'use strict';

    /**
    * mail app property 'categories': feature toggle
    * mail listview model property 'category_id': mail api requests param
    * mail app property 'category_id': stores last selected category
    */

    // helpers
    var DEFAULT_CATEGORY = 'general',
        INBOX = settings.get('folder/inbox'),
        isVisible = false,
        toolbarAction = ext.point('io.ox/mail/actions/category'),
        helper = {
            isVisible: function () {
                return isVisible;
            },
            getInitialCategoryId: function () {
                return DEFAULT_CATEGORY;
            }
        };

    // early exit
    if (!capabilities.has('mail_categories')) return helper;
    if (_.device('smartphone')) return helper;

    // extend mediator
    ext.point('io.ox/mail/mediator').extend(
        {
            id: 'toggle-category-tabs',
            index: 20000,
            setup: function (app) {

                function isEnabled() {
                    return !!app.props.get('categories');
                }

                function isInbox() {
                    return app.folder.get() === INBOX;
                }

                function toggleCategories() {
                    isVisible = isEnabled() && isInbox();
                    app.getWindow().nodes.outer.toggleClass('mail-categories-visible', isVisible);
                    app.listView.model.set('category_id', isVisible ? app.props.get('category_id') : undefined);
                    if (isVisible) api.collection.initializeRefresh();
                    toolbarAction.toggle('default', isVisible);
                }

                app.on('folder:change', toggleCategories);
                app.props.on('change:categories', function () {
                    // ensure inbox if user enables while in a different folder
                    if (isEnabled() && !isInbox()) app.folder.set(INBOX);
                    toggleCategories();
                });

                toggleCategories();
            }
        },
        {
            id: 'foward-category-id',
            index: 20100,
            setup: function (app) {
                // update collection loaders parameter
                app.props.on('change:category_id', function (model, value) {
                    if (!isVisible) return;
                    app.listView.model.set('category_id', value);
                });
            }
        },
        {
            id: 'import',
            // a little bit more than 'import-eml'
            index: 1000000000010,
            setup: function (app) {
                if (!app.queues.importEML) return;
                app.queues.importEML.on('stop', function (e, last, position, files) {
                    var source = helper.getInitialCategoryId(),
                        target = app.listView.model.get('category_id'),
                        imported;
                    // stop when not active or imported to 'general'
                    if (!helper.isVisible() || !target || (source === target)) return;
                    // pick successful reponses
                    imported = _(files).chain()
                                .pluck('response')
                                .filter(function (response) { return !('Error' in response); })
                                .value();
                    // get full data and move to target category
                    mailAPI.getList(imported).done(function (data) {
                        api.move({
                            source: source,
                            target: target,
                            sourcename: api.collection.get(source).get('name'),
                            targetname: api.collection.get(target).get('name'),
                            data: data
                        }).fail(yell);
                    });
                });
            }
        },
        {
            id: 'category-tabs',
            index: 20200,
            setup: function (app) {
                // add placeholder
                // NOTE: Added _.defer as the source order, this should be solved in a more proficient way
                _.defer(function () {
                    var layout = app.props.get('layout');
                    if (layout === 'compact') {
                        app.right.addClass('classic-toolbar-visible').prepend(
                            $('<div class="categories-toolbar-container">').append(
                                new TabView({ props: app.props }).render().$el
                            )
                        );
                    } else {
                        app.getWindow().nodes.body.addClass('classic-toolbar-visible').prepend(
                            $('<div class="categories-toolbar-container">').append(
                                new TabView({ props: app.props }).render().$el
                            )
                        );
                    }
                });

                // events
                api.on('move train', app.listView.reload.bind(app.listView));
                api.collection.on('save', app.listView.reload.bind(app.listView));
            }
        },
        {
            id: 'ensure-category-id',
            index: 20300,
            setup: function (app) {
                // current category gets disabled: use 'general' as fallback
                api.collection.on('change:enabled', function (model, enabled) {
                    if (enabled) return;
                    if (model.id !== app.props.get('category_id')) return;
                    app.props.set('category_id', DEFAULT_CATEGORY);
                });
            }
        },
        {
            id: 'setting-updates-prop',
            index: 20400,
            setup: function (app) {
                settings.on('change:categories/enabled', function (value) {
                    app.props.set('categories', value);
                });
            }
        },
        {
            id: 'check-category-state',
            index: 20500,
            setup: function (app) {
                if (!app.props.get('categories')) return;
                if (settings.get('categories/initialized') !== 'running') return;
                //#. mail categories feature: the update job is running that assigns
                //#. some common mails (e.g. from twitter.com) to predefined categories
                yell('info', gt('It may take some time until mails are assigned to the default categories.'));
            }
        }
    );

    return helper;
});
