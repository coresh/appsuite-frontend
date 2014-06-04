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
     'settings!io.ox/calendar',
     'gettext!io.ox/calendar',
     'io.ox/core/tk/vgrid',
     'io.ox/calendar/toolbar',
     'io.ox/calendar/actions',
     'less!io.ox/calendar/style'
    ], function (date, coreConfig, commons, ext, settings, gt, VGrid) {

    'use strict';

    // application object
    var app = ox.ui.createApp({
        name: 'io.ox/calendar',
        title: 'Calendar'
    }), win;

    app.mediator({

        /*
         * Early List view vsplit - we need that to get a Vgrid instance
         */
        'list-vsplit': function (app) {
            // this causes problems on mobile, the dummy div down here will never be appended
            var vsplit = commons.vsplit($('<div>'), app);
            app.left = vsplit.left;
            app.right = vsplit.right;
        },

        /*
         * VGrid
         */
        'vgrid': function (app) {

            var gridOptions = {
                settings: settings,
                showToggle: _.device('small')
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
        },

        /*
         * Folder view support
         */
        'folder-view': function (app) {
            // folder tree
            commons.addFolderView(app, { type: 'calendar', view: 'FolderList' });
            app.getWindow().nodes.sidepanel.addClass('border-right');
        },

        /*
         * Default application properties
         */
        'props': function (app) {
            var view = settings.get('viewView', 'week:week');
            // introduce shared properties
            app.props = new Backbone.Model({
                'layout': view,
                'checkboxes': app.settings.get('showCheckboxes', true),
                'inverseColors': app.settings.get('inverseColors', false)
            });
        },

        'vgrid-checkboxes': function (app) {
            // always hide checkboxes on small devices initially
            if (_.device('small')) return;
            var grid = app.getGrid();
            grid.setEditable(app.props.get('checkboxes'));
        },

        /*
         * Set folderview property
         */
        'prop-folderview': function (app) {
            app.props.set('folderview', _.device('small') ? false : app.settings.get('folderview/visible/' + _.display(), true));
        },

        /*
         * Store view options
         */
        'store-view-options': function (app) {
            app.props.on('change', _.debounce(function () {
                var data = app.props.toJSON();
                app.settings
                    .set('viewView', data.layout)
                    .set('showCheckboxes', data.checkboxes)
                    .save();
            }, 500));
        },

        /*
         * Respond to folder view changes
         */
        'change:folderview': function (app) {
            if (_.device('small')) return;
            app.props.on('change:folderview', function (model, value) {
                app.toggleFolderView(value);
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
            if (_.device('small')) return;
            app.props.on('change:checkboxes', function (model, value) {
                var grid = app.getGrid();
                grid.setEditable(value);
            });
        },

        /*
         * Respond to change:inverseColors
         */
        'change:inverseColors': function (app) {
            if (_.device('small')) return;
            app.props.on('change:inverseColors', function (model, value) {
                app.getWindow().nodes.outer.toggleClass('inverse-colors', value);
            });
            app.getWindow().nodes.outer.toggleClass('inverse-colors', app.props.get('inverseColors'));
        },

        /*
         * Folerview toolbar
         */
        'folderview-toolbar': function (app) {
            if (_.device('small')) return;
            commons.mediateFolderView(app);
        },

        /*
         * Respond to layout change
         */
        'change:layout': function (app) {
            app.props.on('change:layout', function (model, value) {
                ox.ui.Perspective.show(app, value);
            });
        },
        /*
         * This fixes the missing back button for listview's detailview
         * Can be removed until this App is converted to the Pagecontroller
         */
        'mobile-compatibility': function (app) {
            if (!_.device('smartphone')) return;
            app.left.one('select', function () {
                var content = app.getWindow().nodes.body.find('.window-content');
                $(content).append(app.navbar = $('<div class="rightside-navbar">'));
                app.navbar.append(
                    $('<a href="#" tabindex="-1">').append(
                        $('<i class="fa fa-chevron-left">'), $.txt(' '), $.txt(gt('Back'))
                    ).on('tap', function (e) {
                        e.preventDefault();
                        app.getGrid().selection.clear();
                        $(this).closest('.vsplit').addClass('vsplit-reverse').removeClass('vsplit-slide');
                    })
                );
            });
        }
    });

    // launcher
    app.setLauncher(function (options) {

        // get window
        app.setWindow(win = ox.ui.createWindow({
            name: 'io.ox/calendar',
            chromeless: _.device('!small')
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

        ext.point('io.ox/foldertree/section/links').extend({
            index: 100,
            id: 'show-all',
            draw: function (baton) {

                if (baton.id !== 'private') return;
                if (!baton.data || !baton.options) return;
                if (baton.options.type !== 'calendar') return;
                if (baton.options.dialogmode) return;

                // hide "show all" checkbox when only one calendar is available
                var count =
                    (_.isArray(baton.data['private']) ? baton.data['private'].length : 0) +
                    (_.isArray(baton.data['public']) ? baton.data['public'].length : 0);

                if (count <= 1) return;

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

                if (_.device('small') && _.indexOf(['week:workweek', 'week:week', 'calendar'], lastPerspective) >= 0) {
                    lastPerspective = 'week:day';
                } else {
                    // corrupt data fix
                    if (lastPerspective === 'calendar') lastPerspective = 'week:workweek';
                }

                ox.ui.Perspective.show(app, lastPerspective);
            });

        win.on('change:perspective', function (e, name, id) {
            // save current perspective to settings
            app.props.set('layout', id);
        });

    });

    return {
        getApp: app.getInstance
    };
});
