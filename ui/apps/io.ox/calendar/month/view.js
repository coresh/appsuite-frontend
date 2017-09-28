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

define('io.ox/calendar/month/view', [
    'io.ox/core/extensions',
    'io.ox/core/folder/api',
    'io.ox/calendar/util',
    'io.ox/calendar/chronos-util',
    'gettext!io.ox/calendar',
    'settings!io.ox/chronos',
    'less!io.ox/calendar/month/style',
    'static/3rd.party/jquery-ui.min.js'
], function (ext, folderAPI, util, chronosUtil, gt, settings) {

    'use strict';

    var View = Backbone.View.extend({

        tagName:        'tr',
        className:      'week',
        weekStart:      0,      // week start moment
        weekEnd:        0,      // week ends moment
        folder:         null,
        clickTimer:     null,   // timer to separate single and double click
        clicks:         0,      // click counter
        pane:           $(),
        type:           '',
        limit:          1000,

        events: {
            'click .appointment':      'onClickAppointment',
            'dblclick .day':           'onCreateAppointment',
            'mouseenter .appointment': 'onEnterAppointment',
            'mouseleave .appointment': 'onLeaveAppointment'
        },

        initialize: function (options) {
            this.listenTo(this.collection, 'add remove reset change', _.debounce(this.renderAppointments));
            this.weekStart = moment(options.day);
            this.weekEnds = moment(this.weekStart).add(1, 'week');
            this.folder = options.folder;
            this.pane = options.pane;
            this.app = options.app;
            this.perspective = options.perspective;
            this.weekType = options.weekType;
        },

        onClickAppointment: function (e) {
            var cid = $(e.currentTarget).data('cid'),
                cT = $('[data-cid="' + cid + '"]', this.pane);
            if (cT.hasClass('appointment') && !cT.hasClass('disabled')) {
                var self = this,
                    obj = chronosUtil.cid(String(cid));

                if (!cT.hasClass('current') || _.device('smartphone')) {
                    self.trigger('showAppointment', e, obj);
                    self.pane.find('.appointment')
                        .removeClass('current opac')
                        .not($('[data-cid^="' + obj.folder + '.' + obj.id + '"]', self.pane))
                        .addClass((this.collection.length > this.limit || _.device('smartphone')) ? '' : 'opac');
                    $('[data-cid^="' + obj.folder + '.' + obj.id + '"]', self.pane).addClass('current');
                } else {
                    $('.appointment', self.pane).removeClass('opac');
                }

                if (self.clickTimer === null && self.clicks === 0) {
                    self.clickTimer = setTimeout(function () {
                        clearTimeout(self.clickTimer);
                        self.clicks = 0;
                        self.clickTimer = null;
                    }, 300);
                }
                self.clicks++;

                if (self.clickTimer !== null && self.clicks === 2 && cT.hasClass('modify')) {
                    clearTimeout(self.clickTimer);
                    self.clicks = 0;
                    self.clickTimer = null;
                    self.trigger('openEditAppointment', e, obj);
                }
            }
        },

        onCreateAppointment: function (e) {

            // fix for strange safari-specific bug
            // apparently, the double click changes the selection and then Safari runs into
            // EXC_BAD_ACCESS (SIGSEGV). See bug 42111
            if (_.device('safari')) document.getSelection().collapse(true);

            this.app.folder.can('create').done(function (create) {

                if (!create) return;
                if (!$(e.target).hasClass('list')) return;

                this.trigger('createAppointment', e, $(e.currentTarget).data('date'));

            }.bind(this));
        },

        // handler for onmouseenter event for hover effect
        onEnterAppointment: function (e) {
            var cid = chronosUtil.cid(String($(e.currentTarget).data('cid'))),
                el = $('[data-cid^="' + cid.folder + '.' + cid.id + '"]:visible', this.pane),
                bg = el.data('background-color');
            el.addClass('hover');
            if (bg) el.css('background-color', util.lightenDarkenColor(bg, 0.9));
        },

        // handler for onmouseleave event for hover effect
        onLeaveAppointment: function (e) {
            var cid = chronosUtil.cid(String($(e.currentTarget).data('cid'))),
                el = $('[data-cid^="' + cid.folder + '.' + cid.id + '"]:visible', this.pane),
                bg = el.data('background-color');
            el.removeClass('hover');
            if (bg) el.css('background-color', bg);
        },

        // handler for mobile month view day-change
        changeToSelectedDay: function (timestamp) {
            var d = moment(timestamp);
            // set refDate for app to selected day and change
            // perspective afterwards
            this.app.refDate = d;
            ox.ui.Perspective.show(this.app, 'week:day', { animation: 'slideleft' });
        },

        render: function () {
            // TODO: fix this workaround
            var list = util.getWeekScaffold(this.weekStart),
                firstFound = false,
                self = this,
                // needs clearfix or text is aligned to middle instead of baseline
                weekinfo = $('<td class="week-info clearfix">')
                    .append(
                        $('<span>').addClass('cw').text(
                            gt('CW %1$d', this.weekStart.format('w'))
                        )
                    );

            _(list.days).each(function (day, i) {
                if (day.isFirst) {
                    firstFound = true;
                }

                var dayCell = $('<td>')
                .addClass((day.isFirst ? ' first' : '') +
                    (day.isFirst && i === 0 ? ' forceleftborder' : '') +
                    (day.isToday ? ' today' : '') +
                    (day.isWeekend ? ' weekend' : '') +
                    (day.isFirst || i === 0 ? ' borderleft' : '') +
                    (day.isLast ? ' borderright' : '') +
                    /*eslint-disable no-nested-ternary */
                    (list.hasFirst ? (firstFound ? ' bordertop' : ' borderbottom') : '') +
                    /*eslint-enable no-nested-ternary */
                    (list.hasLast && !firstFound ? ' borderbottom' : '')
                );

                if ((this.weekType === 'first' && !firstFound) || (this.weekType === 'last' && firstFound)) {
                    this.$el.append(dayCell.addClass('day-filler').append($('<div class="sr-only">').text(gt('Empty table cell'))));
                } else {
                    this.$el.append(
                        dayCell
                        .addClass('day')
                        .attr({
                            id: moment(day.timestamp).format('YYYY-M-D'),
                            //#. %1$s is a date: october 12th 2017 for example
                            title: gt('Selected - %1$s', moment(day.timestamp).format('ddd LL'))
                        })
                        .data('date', day.timestamp)
                        .append(
                            $('<div class="number" aria-hidden="true">').text(day.date),
                            $('<div class="list abs">')
                        )
                    );
                }
            }, this);

            if (_.device('smartphone')) {
                // on mobile we switch to the day view after a tap
                // on a day-cell was performed
                this.$el.on('tap', '.day', function () {
                    self.changeToSelectedDay($(this).data('date'));
                });
            } else {
                this.$el.prepend(weekinfo);
            }
            return this;
        },

        renderAppointment: function (a) {
            var self = this,
                el = $('<div class="appointment" data-extension-point="io.ox/calendar/month/view/appointment">')
                    .data('event', a)
                    .attr({
                        'data-cid': a.cid,
                        'data-composite-id': a.cid
                    });

            ext.point('io.ox/calendar/month/view/appointment')
                .invoke('draw', el, ext.Baton(_.extend({}, this.options, { model: a, folder: self.folder, app: self.app })));
            return el;
        },

        renderAppointmentIndicator: function (node) {
            ext.point('io.ox/calendar/month/view/appointment/mobile')
                .invoke('draw', node);
        },

        renderAppointments: function () {
            var self = this,
                tempDate;
            // clear first
            $('.appointment, .fa-circle', this.$el).remove();

            // loop over all appointments
            this.collection.each(function (model) {

                // is declined?
                if (util.getConfirmationStatus(model.attributes) === 2 && !settings.get('showDeclinedAppointments', false)) return;

                var startMoment = model.getMoment('startDate'),
                    endMoment = model.getMoment('endDate'),
                    maxCount = 7;

                // fix full-time values
                if (chronosUtil.isAllday(model)) endMoment.subtract(1, 'millisecond');

                // reduce to dates inside the current week
                startMoment = moment.max(startMoment, this.weekStart).clone();
                endMoment = moment.min(endMoment, this.weekEnds).clone();

                if (_.device('smartphone')) {
                    var cell = $('#' + startMoment.format('YYYY-M-D') + ' .list', this.$el);
                    if (tempDate === undefined) {
                        // first run, draw
                        this.renderAppointmentIndicator(cell);
                    } else if (!startMoment.isSame(tempDate, 'day')) {
                        // one mark per day is enough
                        this.renderAppointmentIndicator(cell);
                    }
                    // remember for next run
                    tempDate = startMoment.clone();
                } else {
                    // draw across multiple days
                    while (maxCount >= 0) {
                        maxCount--;
                        $('#' + startMoment.format('YYYY-M-D') + ' .list', this.$el).append(this.renderAppointment(model));
                        // inc date
                        if (!startMoment.isSame(endMoment, 'day')) {
                            startMoment.add(1, 'day').startOf('day');
                        } else {
                            break;
                        }
                    }
                }
            }, this);

            // exit here if we are on a phone
            if (_.device('smartphone')) return;

            $('.appointment.modify', this.$el).draggable({
                helper: function () {
                    return $(this)
                        .clone()
                        .width($(this).outerWidth());
                },
                appendTo: self.$el,
                scroll: true,
                scrollSpeed: 100,
                scrollSensitivity: 100,
                snap: '.day>.list',
                snapMode: 'inner',
                snapTolerance: 20,
                distance: 20,
                zIndex: 999,
                containment: self.$el.parent(),
                revertDuration: 0,
                revert: function (drop) {
                    //if false then no socket object drop occurred.
                    if (drop === false) {
                        //revert the peg by returning true
                        $(this).show();
                        return true;
                    }
                    //return false so that the peg does not revert
                    return false;
                },
                start: function () {
                    // close sidepopup so it doesn't interfere with dragging/resizing
                    if (self.perspective && self.perspective.dialog) self.perspective.dialog.close();
                    $(this).hide();
                }
            });

            $('.day', this.$el).droppable({
                accept: '.appointment',
                drop: function (e, ui) {
                    $('.list', this).append(
                        ui.draggable.show()
                    );
                    var event = ui.draggable.data('event').clone(),
                        s = event.getMoment('startDate'),
                        start = moment($(this).data('date')).set({ 'hour': s.hours(), 'minute': s.minutes(), 'second': s.seconds(), 'millisecond': s.milliseconds() }),
                        end = start.add(event.getMoment('endDate').diff(event.getMoment('startDate'), 'ms'), 'ms');
                    if (event.getTimestamp('startDate') !== start.valueOf() || event.getTimestamp('endDate') !== end.valueof()) {
                        // save for update calculations
                        if (event.has('rrule')) {
                            event.set({
                                oldStartDate: event.getMoment('startDate'),
                                oldEndDate: event.getMoment('endDate')
                            }, { silent: true });
                        }
                        var format = chronosUtil.isAllday(event) ? 'YYYYMMDD' : 'YYYYMMDD[T]HHmmss';
                        event.set({
                            startDate: { value: start.format(format), tzid: event.get('startDate').tzid },
                            endDate: { value: end.format(format), tzid: event.get('endDate').tzid }
                        });
                        ui.draggable.busy().draggable('disable');
                        self.trigger('updateAppointment', event);
                    }
                }
            });
        }
    });

    View.drawScaffold = function () {
        var days = moment.weekdaysShort(),
            dow = moment.localeData().firstDayOfWeek(),
            tmp = [];
        days = days.slice(dow, days.length).concat(days.slice(0, dow));
        return $('<div class="abs">')
            .append(
                $('<div class="footer-container">').attr('aria-hidden', true).append(
                    $('<div class="footer">').append(function () {
                        _(days).each(function (day) {
                            tmp.push($('<div class="weekday">').text(day));
                        });
                        return tmp;
                    })
                ),
                $('<div class="scrollpane f6-target" tabindex="-1">')
            );
    };

    ext.point('io.ox/calendar/month/view/appointment').extend({
        id: 'default',
        index: 100,
        draw: function (baton) {
            var self = this,
                a = baton.model,
                folder = baton.folder,
                conf = 1,
                confString = '%1$s',
                classes = '';

            function addColors(f) {
                var color = util.getAppointmentColor(f, a);
                if (!color) return;
                self.css({
                    'background-color': color,
                    'color': util.getForegroundColor(color)
                }).data('background-color', color);

                if (util.canAppointmentChangeColor(f, a)) {
                    self.attr('data-folder', f.id);
                }
            }

            var folder_id = a.get('folder');
            if (baton.app.props.get('colorScheme') === 'custom') {
                if (String(folder.id) === String(folder_id)) {
                    addColors(folder);
                } else if (folder_id !== undefined) {
                    folderAPI.get(folder_id).done(addColors);
                }
            }

            if (util.isPrivate(a) && ox.user_id !== a.get('created_by') && !folderAPI.is('private', folder)) {
                classes = 'private';
            } else {
                conf = util.getConfirmationStatus(a.attributes, folderAPI.is('shared', folder) ? folder.created_by : ox.user_id);
                classes = (util.isPrivate(a) ? 'private ' : '') + util.getShownAsClass(a) +
                    ' ' + util.getConfirmationClass(conf) +
                    (folderAPI.can('write', baton.folder, a.attributes) ? ' modify' : '');
                if (conf === 3) {
                    confString =
                        //#. add confirmation status behind appointment title
                        //#. %1$s = apppintment title
                        //#, c-format
                        gt('%1$s (Tentative)');
                }
            }

            this
                .attr({ tabindex: 0 })
                .addClass(classes)
                .append(
                    $('<div>')
                    .addClass('appointment-content')
                    .css('lineHeight', (a.get('full_time') ? this.fulltimeHeight : this.cellHeight) + 'px')
                    .append(
                        util.isPrivate(a) ? $('<span class="private-flag">').append($('<i class="fa fa-lock" aria-hidden="true">'), $('<span class="sr-only">').text(gt('Private'))) : '',
                        a.get('summary') ? $('<div class="title">').text(gt.format(confString, a.get('summary') || '\u00A0')) : '',
                        a.get('location') ? $('<div class="location">').text(a.get('location') || '\u00A0') : ''
                    )
                )
                .attr({
                    'data-extension': 'default'
                });

            util.isBossyAppointmentHandling({ app: a.attributes, folderData: folder }).then(function (isBossy) {
                if (!isBossy) {
                    self.removeClass('modify');
                }
            });
        }
    });

    ext.point('io.ox/calendar/month/view/appointment/mobile').extend({
        id: 'default',
        index: 100,
        draw: function () {
            this.append('<i class="fa fa-circle" aria-hidden="true">');
        }
    });

    return View;
});
