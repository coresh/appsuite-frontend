/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2017 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Daniel Dickhaus <daniel.dickhaus@open-xchange.com>
 */

define('io.ox/chronos/settings/pane', [
    'io.ox/core/extensions',
    'io.ox/backbone/views/extensible',
    'io.ox/backbone/mini-views',
    'io.ox/backbone/mini-views/alarms',
    'io.ox/core/settings/util',
    'settings!io.ox/chronos',
    'gettext!io.ox/calendar'
], function (ext, ExtensibleView, mini, AlarmsView, util, settings, gt) {

    'use strict';

    ext.point('io.ox/settings/pane/main').extend({
        id: 'io.ox/chronos',
        title: 'Chronos',
        ref: 'io.ox/chronos',
        // slightly higher index than calendar
        index: 810,
        advancedMode: true
    });

    ext.point('io.ox/chronos/settings/detail').extend({
        index: 100,
        id: 'view',
        draw: function () {
            this.append(
                new ExtensibleView({ point: 'io.ox/chronos/settings/detail/view', model: settings })
                .inject({
                    getIntervalOptions: function () {
                        return [5, 10, 15, 20, 30, 60].map(function (i) {
                            i = String(i);
                            return { label: gt('%1$d minutes', i), value: i };
                        });
                    },
                    getTimeOptions: function () {
                        var array = [], m = moment().startOf('day');
                        for (var i = 0; i < 24; i++) {
                            array.push({ label: m.format('LT'), value: String(i) });
                            m.add(1, 'hour');
                        }
                        return array;
                    },
                    getWeekDays: function () {
                        return _(new Array(7)).map(function (num, index) {
                            var weekday = moment().weekday(index);
                            return {
                                value: weekday.day(),
                                label: weekday.format('dddd')
                            };
                        });
                    },
                    getWeekLength: function () {
                        return _(new Array(7)).map(function (num, index) {
                            return {
                                value: index + 1,
                                label: gt.format(gt.ngettext('%1$d day', '%1$d days', index + 1), index + 1)
                            };
                        });
                    }
                })
                .build(function () {
                    this.listenTo(settings, 'change', function () {
                        settings.saveAndYell();
                    });
                })
                .render().$el
            );
        }
    });

    var INDEX = 0;

    ext.point('io.ox/chronos/settings/detail/view').extend(
        //
        // Header
        //
        {
            id: 'header',
            index: INDEX += 100,
            render: function () {
                this.$el.addClass('io-ox-chronos-settings').append(
                    util.header(gt.pgettext('app', 'Calendar'))
                );
            }
        },
        //
        // View
        //
        {
            id: 'view',
            index: INDEX += 100,
            render: function () {
                this.$el.append(
                    util.fieldset(
                        //#. the noun, not the verb (e.g. German "Anzeige")
                        gt.pgettext('noun', 'View'),
                        $('<div class="form-group row">').append(
                            // start
                            $('<div class="col-md-4">').append(
                                $('<label for="settings-startTime">').text(gt('Start of working time')),
                                new mini.SelectView({ id: 'settings-startTime', name: 'startTime', model: settings, list: this.getTimeOptions() }).render().$el
                            ),
                            // end
                            $('<div class="col-md-4">').append(
                                $('<label for="settings-endTime">').text(gt('End of working time')),
                                new mini.SelectView({ id: 'settings-endTime', name: 'endTime', model: settings, list: this.getTimeOptions() }).render().$el
                            ),
                            // scale
                            $('<div class="col-md-4">').append(
                                $('<label for="settings-interval">').text(gt('Time scale')),
                                new mini.SelectView({ id: 'settings-interval', name: 'interval', model: settings, list: this.getIntervalOptions() }).render().$el
                            )
                        ),
                        // declined
                        $('<div class="form-group">').append(
                            util.checkbox('showDeclinedAppointments', gt('Show declined appointments'), settings)
                        )
                    )
                );
            }
        },
        //
        // Work week
        //
        {
            id: 'workweek',
            index: INDEX += 100,
            render: function () {
                this.$el.append(
                    util.fieldset(
                        gt('Workweek view'),
                        // start & length
                        $('<div class="form-group row">').append(
                            // first day
                            $('<div class="col-md-4">').append(
                                $('<label for="settings-workweekStart">').text(gt('Week start')),
                                new mini.SelectView({ id: 'settings-workweekStart', name: 'workweekStart', model: settings, list: this.getWeekDays(), integer: true }).render().$el
                            ),
                            // work week length
                            $('<div class="col-md-4">').append(
                                $('<label for="settings-numDaysWorkweek">').text(gt('Workweek length')),
                                new mini.SelectView({ id: 'settings-numDaysWorkweek', name: 'numDaysWorkweek', model: settings, list: this.getWeekLength(), integer: true }).render().$el
                            )
                        )
                    )
                );
            }
        },
        {
            index: INDEX += 100,
            id: 'New',
            render: function () {
                this.$el.append(
                    util.fieldset(gt('New appointment'),
                        // same width as col-md-10 but without the strange input and hover issues
                        $('<div>').css('width', '83.33333333%').append(
                            $('<label>').text(gt('Default reminder')),
                            new AlarmsView({ model: settings, attribute: 'defaultReminder' }).render().$el
                        ),
                        $('<div class="form-group expertmode">').append(
                            util.checkbox('markFulltimeAppointmentsAsFree', gt('Mark all day appointments as free'), settings)
                        )
                    )
                );
            }
        },
        //
        // Notifications
        //
        {
            id: 'notifications',
            index: INDEX += 100,
            render: function () {
                this.$el.append(
                    util.fieldset(gt('Email notifications'),
                        $('<div class="form-group">').append(
                            util.checkbox('notifyNewModifiedDeleted', gt('Receive notification for appointment changes'), settings),
                            util.checkbox('notifyAcceptedDeclinedAsCreator', gt('Receive notification as appointment creator when participants accept or decline'), settings),
                            util.checkbox('notifyAcceptedDeclinedAsParticipant', gt('Receive notification as appointment participant when other participants accept or decline'), settings),
                            util.checkbox('deleteInvitationMailAfterAction', gt('Automatically delete the invitation email after the appointment has been accepted or declined'), settings)
                        )
                    )
                );
            }
        }
    );
});