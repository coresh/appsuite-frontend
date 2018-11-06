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
 * @author Richard Petersen <richard.petersen@open-xchange.com>
 */

define('io.ox/calendar/perspective', [
    'io.ox/core/extensions',
    'io.ox/calendar/api',
    'io.ox/calendar/model',
    'io.ox/calendar/util',
    'io.ox/calendar/view-detail',
    'io.ox/core/tk/dialogs',
    'io.ox/core/yell',
    'gettext!io.ox/calendar',
    'io.ox/core/capabilities',
    'settings!io.ox/calendar',
    'io.ox/core/folder/api'
], function (ext, api, calendarModel, util, detailView, dialogs, yell, gt, capabilities, settings, folderAPI) {

    'use strict';

    return Backbone.View.extend({

        clickTimer:     null, // timer to separate single and double click
        clicks:         0, // click counter

        events: function () {
            var events = {
                'click .appointment': 'onClickAppointment'
            };
            if (_.device('touch')) {
                _.extend(events, {
                    'swipeleft': 'onPrevious',
                    'swiperight': 'onNext'
                });
            }
            return events;
        },

        initialize: function () {
            this.listenTo(this.model, 'change:date', this.onChangeDate);
            this.listenTo(api, 'refresh.all', this.refresh.bind(this, true));
            this.listenTo(api, 'create update', this.onCreateUpdateAppointment);
            this.listenTo(this.app, 'folders:change', this.refresh);
            this.listenTo(this.app.props, 'change:date', this.getCallback('onChangeDate'));
            this.app.getWindow().on('show', this.onWindowShow.bind(this));
            this.listenTo(settings, 'change:showDeclinedAppointments', this.getCallback('onResetAppointments'));
            this.listenTo(folderAPI, 'before:update', this.beforeUpdateFolder);

            this.followDeepLink();
        },

        // needs to be implemented by the according view
        render: $.noop,
        refresh: $.noop,
        onWindowShow: $.noop,
        onChangeDate: $.noop,

        setCollection: function (collection) {
            if (this.collection === collection) return;

            if (this.collection) this.stopListening(this.collection);
            this.collection = collection;

            this.onResetAppointments();

            this
                .listenTo(this.collection, 'add', this.onAddAppointment)
                .listenTo(this.collection, 'change', this.onChangeAppointment)
                .listenTo(this.collection, 'remove', this.onRemoveAppointment)
                .listenTo(this.collection, 'reset', this.onResetAppointments);
        },

        onAddAppointment: $.noop,
        onChangeAppointment: $.noop,
        onRemoveAppointment: $.noop,
        onResetAppointments: $.noop,

        getName: $.noop,

        showAppointment: (function () {
            function failHandler(e) {
                // CAL-4040: Appointment not found
                if (e && e.code === 'CAL-4040') {
                    yell(e);
                } else {
                    yell('error', gt('An error occurred. Please try again.'));
                }
                this.dialog.close();
                this.$('.appointment').removeClass('opac current');
                this.trigger('show:appointment:fail');
                if (_.device('smartphone')) {
                    this.app.pages.getPage('detailView').idle();
                    this.app.pages.goBack();
                }
            }

            return function (e, obj) {
                // open appointment details
                var self = this, dialog = this.getDialog();

                if (_.device('smartphone')) {
                    self.app.pages.changePage('detailView');
                    self.app.pages.getPage('detailView').busy();
                }

                self.detailCID = api.cid(obj);

                if (_.device('smartphone')) {
                    var p = self.app.pages.getPage('detailView');
                    api.get(obj).then(function (model) {
                        var b = new ext.Baton({ data: model.toJSON(), model: model });
                        p.idle().empty().append(detailView.draw(b));
                        self.app.pages.getToolbar('detailView').setBaton(b);
                    }, failHandler.bind(self));
                } else {
                    dialog.show(e, function (popup) {
                        popup
                        .busy()
                        .attr({
                            'role': 'complementary',
                            'aria-label': gt('Appointment Details')
                        });

                        api.get(obj).then(function (model) {
                            if (model.cid !== self.detailCID) return;
                            popup.idle().append(detailView.draw(new ext.Baton({ model: model })));
                        }, failHandler.bind(self));
                    });
                }
            };
        }()),

        closeAppointment: function () {
            this.$('.appointment').removeClass('opac current');
        },

        getDialog: function () {
            if (!this.dialog) {
                // define default sidepopup dialog
                this.dialog = new dialogs.SidePopup({ tabTrap: true, preserveOnAppchange: true })
                .on('close', this.closeAppointment.bind(this));
            }
            return this.dialog;
        },

        onClickAppointment: function (e) {
            var target = $(e[(e.type === 'keydown') ? 'target' : 'currentTarget']);
            if (target.hasClass('appointment') && !this.model.get('lasso') && !target.hasClass('disabled')) {
                var self = this,
                    obj = util.cid(String(target.data('cid')));
                if (!target.hasClass('current') || _.device('smartphone')) {
                    // ignore the "current" check on smartphones
                    this.$('.appointment')
                        .removeClass('current opac')
                        .not(this.$('[data-master-id="' + obj.folder + '.' + obj.id + '"]'))
                        .addClass((this.collection.length > this.limit || _.device('smartphone')) ? '' : 'opac'); // do not add opac class on phones or if collection is too large
                    this.$('[data-master-id="' + obj.folder + '.' + obj.id + '"]').addClass('current');
                    this.showAppointment(e, obj);

                } else {
                    this.$('.appointment').removeClass('opac');
                }

                if (this.clickTimer === null && this.clicks === 0) {
                    this.clickTimer = setTimeout(function () {
                        clearTimeout(self.clickTimer);
                        self.clicks = 0;
                        self.clickTimer = null;
                    }, 300);
                }
                this.clicks++;

                if (this.clickTimer !== null && this.clicks === 2 && target.hasClass('modify') && e.type === 'click') {
                    clearTimeout(this.clickTimer);
                    this.clicks = 0;
                    this.clickTimer = null;
                    api.get(obj).done(function (model) {
                        if (self.dialog) self.dialog.close();
                        ext.point('io.ox/calendar/detail/actions/edit')
                            .invoke('action', self, { data: model.toJSON() });
                    });
                }
            }
        },

        createAppointment: function (data) {
            if (capabilities.has('guest')) return;

            ext.point('io.ox/calendar/detail/actions/create')
            .invoke('action', this, { app: this.app }, data);
        },

        updateAppointment: function (model, updates) {
            var prevStartDate = model.getMoment('startDate'),
                prevEndDate = model.getMoment('endDate'),
                prevFolder = model.get('folder');

            var hasChanges = _(updates).reduce(function (memo, value, key) {
                return memo || !_.isEqual(model.get(key), value);
            }, false);
            if (!hasChanges) return;

            model.set(updates);
            var nodes = this.$('[data-master-id="' + api.cid({ id: model.get('id'), folder: model.get('folder') }) + '"]').busy();

            function reset() {
                model.set({
                    startDate: model.previous('startDate'),
                    endDate: model.previous('endDate'),
                    folder: prevFolder
                });
                nodes.idle();
            }

            function apiUpdate(model, options) {
                var obj = _(model.toJSON()).pick('id', 'folder', 'recurrenceId', 'seriesId', 'startDate', 'endDate', 'timestamp');

                api.update(obj, options).then(function success(data) {
                    if (!data || !data.conflicts) return nodes.idle();

                    ox.load(['io.ox/calendar/conflicts/conflictList']).done(function (conflictView) {
                        conflictView.dialog(data.conflicts)
                            .on('cancel', reset)
                            .on('ignore', function () {
                                apiUpdate(model, _.extend(options || {}, { checkConflicts: false }));
                            });
                    });
                }, function fail(error) {
                    reset();
                    yell(error);
                });
            }

            util.showRecurrenceDialog(model)
                .done(function (action) {
                    switch (action) {
                        case 'series':
                            api.get({ id: model.get('seriesId'), folder: model.get('folder') }, false).done(function (masterModel) {
                                // calculate new dates if old dates are available
                                var oldStartDate = masterModel.getMoment('startDate'),
                                    startDate = masterModel.getMoment('startDate').add(model.getMoment('startDate').diff(prevStartDate, 'ms'), 'ms'),
                                    endDate = masterModel.getMoment('endDate').add(model.getMoment('endDate').diff(prevEndDate, 'ms'), 'ms'),
                                    format = util.isAllday(model) ? 'YYYYMMDD' : 'YYYYMMDD[T]HHmmss';
                                masterModel.set({
                                    startDate: { value: startDate.format(format), tzid: masterModel.get('startDate').tzid },
                                    endDate: { value: endDate.format(format), tzid: masterModel.get('endDate').tzid }
                                });
                                util.updateRecurrenceDate(masterModel, oldStartDate);
                                apiUpdate(masterModel, _.extend(util.getCurrentRangeOptions(), {
                                    checkConflicts: true,
                                    recurrenceRange: action === 'thisandfuture' ? 'THISANDFUTURE' : undefined
                                }));
                            });
                            break;
                        case 'thisandfuture':
                            // get recurrence master object
                            api.get({ id: model.get('seriesId'), folder: model.get('folder') }, false).done(function (masterModel) {
                                // calculate new dates if old dates are available use temporary new model to store data before the series split
                                var updateModel = new calendarModel.Model(util.createUpdateData(masterModel, model)),
                                    oldStartDate = masterModel.getMoment('startDate');

                                updateModel.set({
                                    startDate: model.get('startDate'),
                                    endDate: model.get('endDate')
                                });
                                util.updateRecurrenceDate(model, oldStartDate);
                                apiUpdate(updateModel, _.extend(util.getCurrentRangeOptions(), {
                                    checkConflicts: true,
                                    recurrenceRange: 'THISANDFUTURE'
                                }));
                            });
                            break;
                        case 'appointment':
                            apiUpdate(model, _.extend(util.getCurrentRangeOptions(), { checkConflicts: true }));
                            break;
                        default:
                            reset();
                            return;
                    }
                });
        },

        // /*
        //  * Returns a function which will execute the requested function of the view
        //  * as soon as the view is visible
        //  */
        getCallback: function (name) {
            var last;
            return function () {
                var func = this[name], args = _(arguments).toArray();
                if (last) this.off('show', last);
                last = undefined;
                if (this.$el.is(':visible')) return func.apply(this, args);
                this.once('show', last = function () {
                    func.apply(this, args);
                });
            }.bind(this);
        },

        beforeUpdateFolder: function (id, model) {
            if (model.get('module') !== 'calendar') return;
            if (!model.changed['com.openexchange.calendar.extendedProperties']) return;

            var color = util.getFolderColor(model.attributes),
                appointments = this.$('.appointment[data-folder="' + model.get('id') + '"]');

            appointments
                .css({
                    'background-color': color,
                    'color': util.getForegroundColor(color)
                })
                .data('background-color', color)
                .removeClass('black white')
                .addClass(util.getForegroundColor(color) === 'white' ? 'white' : 'black');
        },

        // id must be set in URL
        followDeepLink: function () {
            var cid = _.url.hash('id'), e, self = this;
            if (cid) {
                cid = cid.split(',', 1)[0];

                // see if id is missing the folder
                if (cid.indexOf('.') === -1) {
                    // cid is missing folder appointment cannot be restored
                    if (!_.url.hash('folder')) return;
                    // url has folder attribute. Add this
                    cid = _.url.hash('folder') + '.' + cid;
                }

                api.get(api.cid(cid)).done(function (model) {
                    self.setStartDate(model.getMoment('startDate'));
                    if (_.device('smartphone')) {
                        ox.launch('io.ox/calendar/detail/main', { cid: cid });
                    } else {
                        e = $.Event('click', { target: self.$el });
                        self.showAppointment(e, util.cid(cid), { arrow: false });
                    }
                });
            }
        },

        onCreateUpdateAppointment: function (obj) {
            var current = ox.ui.App.getCurrentApp().getName();
            if (!/^io.ox\/calendar/.test(current)) return;
            if (obj.seriesId && obj.seriesId === obj.id) return;
            if (!this.selectAppointment) return;

            this.selectAppointment(new calendarModel.Model(obj));
        }

    });

});