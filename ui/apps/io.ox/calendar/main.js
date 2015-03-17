/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2011 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/calendar/main',
    ['io.ox/core/date',
     'settings!io.ox/core',
     'io.ox/core/commons',
     'io.ox/core/extensions',
     'io.ox/core/capabilities',
     'io.ox/core/folder/api',
     'io.ox/core/folder/tree',
     'io.ox/core/folder/view',
     'settings!io.ox/calendar',
     'gettext!io.ox/calendar',
     'io.ox/core/tk/vgrid',
     'io.ox/core/toolbars-mobile',
     'io.ox/core/page-controller',
     'io.ox/calendar/api',
     'io.ox/calendar/mobile-navbar-extensions',
     'io.ox/calendar/mobile-toolbar-actions',
     'io.ox/calendar/toolbar',
     'io.ox/calendar/actions',
     'less!io.ox/calendar/style'
    ], function (date, coreConfig, commons, ext, capabilities, folderAPI, TreeView, FolderView, settings, gt, VGrid, Bars, PageController, api) {

    'use strict';

    // application object
    var app = ox.ui.createApp({
        name: 'io.ox/calendar',
        title: 'Calendar'
    }), win;

    app.mediator({
        /*
         * Init pages for mobile use
         * Each View will get a single page with own
         * toolbars and navbars. A PageController instance
         * will handle the page changes and also maintain
         * the state of the toolbars and navbars
         */
        'pages-mobile': function (app) {
            if (_.device('!smartphone')) return;
            var c = app.getWindow().nodes.main;
            var navbar = $('<div class="mobile-navbar">'),
                toolbar = $('<div class="mobile-toolbar">');

            app.navbar = navbar;
            app.toolbar = toolbar;

            app.pages = new PageController(app);

            app.getWindow().nodes.body.addClass('classic-toolbar-visible').append(navbar, toolbar);

            // create 3 pages with toolbars and navbars
            app.pages.addPage({
                name: 'folderTree',
                container: c,
                navbar: new Bars.NavbarView({
                    app: app,
                    extension: 'io.ox/calendar/mobile/navbar'
                })
            });

            // create 3 pages with toolbars and navbars
            app.pages.addPage({
                name: 'month',
                container: c,
                navbar: new Bars.NavbarView({
                    app: app,
                    extension: 'io.ox/calendar/mobile/navbar'
                }),
                toolbar: new Bars.ToolbarView({
                    app: app,
                    page: 'month',
                    extension: 'io.ox/calendar/mobile/toolbar'
                }),
                startPage: true
            });

            app.pages.addPage({
                name: 'week',
                container: c,
                navbar: new Bars.NavbarView({
                    app: app,
                    extension: 'io.ox/calendar/mobile/navbar'
                }),
                toolbar: new Bars.ToolbarView({
                    app: app,
                    page: 'week',
                    extension: 'io.ox/calendar/mobile/toolbar'
                })
            });

            app.pages.addPage({
                name: 'list',
                container: c,
                navbar: new Bars.NavbarView({
                    app: app,
                    extension: 'io.ox/calendar/mobile/navbar'
                }),
                toolbar: new Bars.ToolbarView({
                    app: app,
                    page: 'list',
                    extension: 'io.ox/calendar/mobile/toolbar'
                }),
                secondaryToolbar: new Bars.ToolbarView({
                    app: app,
                    page: 'list/multiselect',
                    extension: 'io.ox/calendar/mobile/toolbar'
                })
            });

            app.pages.addPage({
                name: 'detailView',
                container: c,
                navbar: new Bars.NavbarView({
                    app: app,
                    extension: 'io.ox/calendar/mobile/navbar'
                }),
                toolbar: new Bars.ToolbarView({
                    app: app,
                    page: 'detailView',
                    extension: 'io.ox/calendar/mobile/toolbar'

                })
            });

            // important
            // tell page controller about special navigation rules
            app.pages.setBackbuttonRules({
                'month': 'folderTree',
                'week': 'month',
                'list': 'folderTree'
            });
        },
        /*
         * Pagecontroller
         */
        'pages-desktop': function (app) {
            if (_.device('smartphone')) return;
            var c = app.getWindow().nodes.main;

            app.pages = new PageController(app);

            // create 3 pages with toolbars and navbars
            app.pages.addPage({
                name: 'month',
                container: c,
                startPage: true
            });

            app.pages.addPage({
                name: 'week',
                container: c
            });

            app.pages.addPage({
                name: 'list',
                container: c
            });
        },

        /*
         * Early List view vsplit - we need that to get a Vgrid instance
         * Vsplit compatibilty
         */
        'list-vsplit': function (app) {
            if (_.device('smartphone')) return;
            var vsplit = commons.vsplit($('<div>'), app);
            app.left = vsplit.left;
            app.right = vsplit.right;
        },

        /*
         * Early List view vsplit - we need that to get a Vgrid instance
         * Vsplit compatibilty
         */
        'list-vsplit-mobile': function (app) {
            if (_.device('!smartphone')) return;
            app.left = app.pages.getPage('list');
            app.right = app.pages.getPage('detailView');
        },

        /*
         * Init all nav- and toolbar labels for mobile
         */
        'navbars-mobile': function (app) {

            if (_.device('!smartphone')) return;

            app.pages.getNavbar('month')
                .on('leftAction', function () {
                    app.pages.goBack();
                })
                .setLeft(gt('Folders'));

            app.pages.getNavbar('week')
                .on('leftAction', function () {
                    ox.ui.Perspective.show(app, 'month', {animation: 'slideright'});
                })
                .setLeft(gt('Back'));

            app.pages.getNavbar('list')
                .on('leftAction', function () {
                    app.pages.goBack();
                })
                .setLeft(gt('Folders'))
                .setRight(
                    //#. Used as a button label to enter the "edit mode"
                    gt('Edit')
                );

            app.pages.getNavbar('folderTree')
                .setTitle(gt('Folders'))
                .setLeft(false)
                .setRight(gt('Edit'));

            app.pages.getNavbar('detailView')
                .setTitle('')
                .setLeft(
                    //#. Used as button label for a navigation action, like the browser back button
                    gt('Back')
                );

            app.pages.getNavbar('detailView').on('leftAction', function () {
                app.pages.goBack();
            });

           // checkbox toggle
            app.pages.getNavbar('list').on('rightAction', function () {
                if (app.props.get('checkboxes') === true) {
                    // leave multiselect? -> clear selection
                    app.grid.selection.clear();
                    app.grid.showTopbar(false);
                    app.grid.showToolbar(false);
                    app.pages.getNavbar('list').setRight(gt('Edit')).show('.left');
                } else {
                     // also show sorting options
                    app.grid.showTopbar(true);
                    app.grid.showToolbar(true);
                    app.pages.getNavbar('list').setRight(gt('Cancel')).hide('.left');
                }
                app.props.set('checkboxes', !app.props.get('checkboxes'));
            });
        },

        /*
         * VGrid
         */
        'vgrid': function (app) {

            var gridOptions = {
                settings: settings,
                showToggle: _.device('smartphone'),
                hideTopbar: _.device('smartphone'),
                hideToolbar: _.device('smartphone'),
                // if it's shown, it should be on the top
                toolbarPlacement: 'top'
            };

            // show "load more" link
            gridOptions.tail = function () {
                var link = $('<div class="vgrid-cell tail">').append(
                    //#. Label for a button which shows more upcoming
                    //#. appointments in a listview by extending the search
                    //#. by one month in the future
                    $('<a href="#" tabindex="1">').text(gt('Expand timeframe by one month'))
                );
                return link;
            };

            app.grid = new VGrid(app.left, gridOptions);

            app.getGrid = function () {
                return this.grid;
            };

            if (_.device('smartphone')) {
                // remove some stuff from toolbar once
                app.grid.one('meta:update', function () {
                    app.grid.getToolbar().find('.select-all-toggle, .grid-info').hide();
                });
            }
        },

        /*
         * Folder view support
         */
        'folder-view': function (app) {

            // tree view
            var tree = new TreeView({ app: app, contextmenu: true, flat: true, indent: false, module: 'calendar' });

            // initialize folder view
            FolderView.initialize({ app: app, tree: tree });
            app.folderView.resize.enable();
        },

         'toggle-folder-editmode': function (app) {

            if (_.device('!smartphone')) return;

            var toggle =  function () {

                var page = app.pages.getPage('folderTree'),
                    state = app.props.get('mobileFolderSelectMode'),
                    right = state ? gt('Edit') : gt('Cancel');
                app.props.set('mobileFolderSelectMode', !state);
                app.pages.getNavbar('folderTree').setRight(right);
                page.toggleClass('mobile-edit-mode', !state);
            };

            app.toggleFolders = toggle;
        },

        /*
         * Folder view mobile support
         */
        'folder-view-mobile': function (app) {
            if (_.device('!smartphone')) return;

            var nav = app.pages.getNavbar('folderTree'),
                page = app.pages.getPage('folderTree');

            nav.on('rightAction', function () {
                app.toggleFolders();
            });

            var tree = new TreeView({
                app: app,
                contextmenu: true,
                flat: true,
                indent: false,
                module: 'calendar'
            });
            // always change to month view after folder change
            var cb = function () {
                if (app.getWindow().currentPerspective !== 'month') {
                    ox.ui.Perspective.show(app, 'month');
                }
            };
            // initialize folder view
            FolderView.initialize({ app: app, tree: tree, firstResponder: 'month', respondCallback: cb});
            page.append(tree.render().$el);
        },

        /*
         * Default application properties
         */
        'props': function (app) {
            var view = settings.get('viewView', 'week:week');
            // introduce shared properties
            app.props = new Backbone.Model({
                'layout': view,
                'checkboxes': _.device('smartphone') ? false : app.settings.get('showCheckboxes', true),
                'darkColors': app.settings.get('darkColors', false),
                'mobileFolderSelectMode': false
            });
        },

        'vgrid-checkboxes': function (app) {
            // always hide checkboxes on small devices initially
            if (_.device('smartphone')) return;
            var grid = app.getGrid();
            grid.setEditable(app.props.get('checkboxes'));
        },

        /*
         * Set folderview property
         */
        'prop-folderview': function (app) {
            if (_.device('smartphone')) return;
            app.props.set('folderview', app.settings.get('folderview/visible/' + _.display(), true));
        },

         /*
         * Set folderview property
         */
        'prop-folderview-mobile': function (app) {
            if (_.device('!smartphone')) return;
            app.props.set('folderview', false);
        },

        /*
         * Store view options
         */
        'store-view-options': function (app) {
            if (_.device('smartphone')) return;
            app.props.on('change', _.debounce(function (model, options) {
                if (!options || options.fluent) return;
                var data = app.props.toJSON();
                app.settings
                    .set('viewView', data.layout)
                    .set('showCheckboxes', data.checkboxes)
                    .set('darkColors', data.darkColors)
                    .save();
            }, 500));
        },

        /*
         * Respond to folder view changes
         */
        'change:folderview': function (app) {
            if (_.device('smartphone')) return;
            app.props.on('change:folderview', function (model, value) {
                app.folderView.toggle(value);
            });
            app.on('folderview:close', function () {
                app.props.set('folderview', false);
            });
            app.on('folderview:open', function () {
                app.props.set('folderview', true);
            });
        },

        /*
         * Respond to change:checkboxes
         */
        'change:checkboxes': function (app) {
            //if (_.device('smartphone')) return;
            app.props.on('change:checkboxes', function (model, value) {
                app.grid.setEditable(value);
            });
        },

        /*
         * Respond to change:darkColors
         */
        'change:darkColors': function (app) {
            if (_.device('smartphone')) return;
            app.props.on('change:darkColors', function (model, value) {
                app.getWindow().nodes.outer.toggleClass('dark-colors', value);
            });
            app.getWindow().nodes.outer.toggleClass('dark-colors', app.props.get('darkColors'));
        },

        /*
         * Folerview toolbar
         */
        'folderview-toolbar': function (app) {
            if (_.device('smartphone')) return;
            commons.mediateFolderView(app);
        },

        /*
         * Respond to layout change
         */
        'change:layout': function (app) {
            app.props.on('change:layout', function (model, value) {
                // no animations on desktop
                ox.ui.Perspective.show(app, value, {disableAnimations: true});
            });
        },

        /*
         * Handle page change on delete on mobiles
         */
        'delete-mobile': function (app) {
            if (_.device('!smartphone')) return;
            api.on('delete', function () {
                if (app.pages.getCurrentPage().name === 'detailView') {
                    app.pages.goBack();
                }
            });
        },

        'inplace-search': function (app) {

            if (_.device('small') || !capabilities.has('search')) return;

            var win = app.getWindow(), side = win.nodes.sidepanel;
            side.addClass('top-toolbar');

            // when search is ready
            win.facetedsearch.ready
                .done(function (facetedsearch) {
                    var lastPerspective,
                        SEARCH_PERSPECTIVE = 'list',
                        cancelSearch = function () {
                            var win = app.getWindow();
                            if (win.facetedsearch && win.facetedsearch.view)
                                win.facetedsearch.view.trigger('button:cancel');
                        };
                    // register
                    commons.wireGridAndSearch(app.grid, app.getWindow(), facetedsearch.apiproxy);

                    // additional handler: switch to list perspective (and back)
                    win.on({
                        'search:query': function () {
                            // switch to supported perspective
                            lastPerspective = lastPerspective || app.props.get('layout') || _.url.hash('perspective');
                            if (lastPerspective !== SEARCH_PERSPECTIVE) {
                                // fluent option: do not write to user settings
                                app.props.set('layout', SEARCH_PERSPECTIVE, {fluent: true});
                                // cancel search when user changes view
                                app.props.on('change:layout', cancelSearch);
                            }
                        },
                        'search:cancel': function () {
                            // switch back to perspective used before
                            var currentPerspective = _.url.hash('perspective') || app.props.get('layout');
                            if (lastPerspective && lastPerspective !== currentPerspective)
                                app.props.set('layout', lastPerspective);
                            // disable
                            app.props.off('change:layout', cancelSearch);
                            // reset
                            lastPerspective = undefined;

                        }
                    });
                });
        },
        /*
         * mobile only
         * change current month label in navbar
         */
        'change:navbar:month': function (app) {
            if (_.device('!smartphone')) return;
            app.on('change:navbar:month', function (title) {
                app.pages.getNavbar('month').setTitle(title);
            });
        },
        /*
         * mobile only
         * change current date label in navbar
         */
        'change:navbar:date-mobile': function (app) {
            if (_.device('!smartphone')) return;
            app.pages.getPage('week').on('change:navbar:date', function (e, dates) {
                app.pages.getNavbar('week').setTitle(dates.date);
            });
        },
        /*
         * mobile only
         *
         */
        'show-weekview-mobile': function (app) {
            if (_.device('!smartphone')) return;
            app.pages.getPage('week').on('pageshow', function () {
                //app.pages.getPageObject('week').perspective.view.setScrollPos();
            });
        }

    });

    // launcher
    app.setLauncher(function (options) {

        // get window
        app.setWindow(win = ox.ui.createWindow({
            name: 'io.ox/calendar',
            facetedsearch: capabilities.has('search'),
            chromeless: true
        }));

        app.settings = settings;
        app.refDate = new date.Local();

        win.addClass('io-ox-calendar-main');

        // easy debugging
        window.calendar = app;

        // "show all" extension for folder view

        function changeShowAll() {
            settings.set('showAllPrivateAppointments', $(this).prop('checked')).save();
            win.getPerspective().refresh();
        }

        ext.point('io.ox/core/foldertree/calendar/links').extend({
            index: 100,
            id: 'show-all',
            draw: function (baton) {

                if (baton.context !== 'app') return;
                if (!baton.data || !baton.options) return;

                this.append(
                    $('<div class="show-all-checkbox">').append(
                        $('<label class="checkbox">').append(
                            $('<input type="checkbox" tabindex="1">')
                                .prop('checked', settings.get('showAllPrivateAppointments', false))
                                .on('change', changeShowAll),
                            $.txt(gt('Show all my appointments from all calendars'))
                        )
                    )
                );

                // hide "show all" checkbox when only one calendar is available
                function toggle() {
                    var count = folderAPI.getFlatCollection('calendar', 'private').length + folderAPI.getFlatCollection('calendar', 'public').length;
                    this.$el.find('.show-all-checkbox').toggle(count > 0);
                }

                baton.view.listenTo(folderAPI.getFlatCollection('calendar', 'private'), 'add remove reset', toggle);
                baton.view.listenTo(folderAPI.getFlatCollection('calendar', 'public'), 'add remove reset', toggle);

                toggle.call(baton.view);
            }
        });

        // go!
        commons.addFolderSupport(app, null, 'calendar', options.folder || coreConfig.get('folder/calendar'))
            .always(function () {
                app.mediate();
                win.show();
            })
            .done(function () {

                // app perspective
                var lastPerspective = options.perspective || _.url.hash('perspective') || app.props.get('layout');

                if (_.device('smartphone') && _.indexOf(['week:workweek', 'week:week', 'calendar'], lastPerspective) >= 0) {
                    lastPerspective = 'week:day';
                } else {
                    // corrupt data fix
                    if (lastPerspective === 'calendar') lastPerspective = 'week:workweek';
                }
                ox.ui.Perspective.show(app, lastPerspective, {disableAnimations: true});
                app.props.set('layout', lastPerspective);
            });
    });

    return {
        getApp: app.getInstance
    };
});
