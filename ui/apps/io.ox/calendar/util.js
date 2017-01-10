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

define('io.ox/calendar/util', [
    'io.ox/core/api/user',
    'io.ox/contacts/api',
    'io.ox/core/api/group',
    'io.ox/core/folder/api',
    'io.ox/core/util',
    'io.ox/core/folder/folder-color',
    'settings!io.ox/calendar',
    'gettext!io.ox/calendar'
], function (userAPI, contactAPI, groupAPI, folderAPI, util, color, settings, gt) {

    'use strict';

    // day names
    var n_count = [gt('fifth / last'), '', gt('first'), gt('second'), gt('third'), gt('fourth'), gt('fifth / last')],
        // shown as
        n_shownAs = [gt('Reserved'), gt('Temporary'), gt('Absent'), gt('Free')],
        shownAsClass = 'reserved temporary absent free'.split(' '),
        shownAsLabel = 'label-info label-warning label-important label-success'.split(' '),
        // confirmation status (none, accepted, declined, tentative)
        confirmClass = 'unconfirmed accepted declined tentative'.split(' '),
        confirmTitles = [
            gt('unconfirmed'),
            gt('accepted'),
            gt('declined'),
            gt('tentative')
        ],
        n_confirm = ['', '<i class="fa fa-check" aria-hidden="true">', '<i class="fa fa-times" aria-hidden="true">', '<i class="fa fa-question-circle" aria-hidden="true">'],
        colorLabels = [gt('no color'), gt('light blue'), gt('dark blue'), gt('purple'), gt('pink'), gt('red'), gt('orange'), gt('yellow'), gt('light green'), gt('dark green'), gt('gray')];

    var that = {

        // column translations
        columns: {
            title: gt('Subject'),
            location: gt('Location'),
            note: gt('Description')
        },

        // day bitmask
        days: {
            SUNDAY: 1,
            MONDAY: 2,
            TUESDAY: 4,
            WEDNESDAY: 8,
            THURSDAY: 16,
            FRIDAY: 32,
            SATURDAY: 64
        },

        isBossyAppointmentHandling: function (opt) {

            opt = _.extend({
                app: {},
                invert: false,
                folderData: null
            }, opt);

            if (!settings.get('bossyAppointmentHandling', false)) return $.when(true);

            var check = function (data) {
                if (folderAPI.is('private', data)) {
                    var isOrganizer = opt.app.organizerId === ox.user_id;
                    return opt.invert ? !isOrganizer : isOrganizer;
                }
                return true;
            };

            if (opt.folderData) return $.when(check(opt.folderData));

            if (!opt.app.folder_id) return $.when(false);

            return folderAPI.get(opt.app.folder_id).then(function (data) {
                return check(data);
            });
        },

        getFirstWeekDay: function () {
            // week starts with (0=Sunday, 1=Monday, ..., 6=Saturday)
            return moment.localeData().firstDayOfWeek();
        },

        getDaysInMonth: function (year, month) {
            // trick: month + 1 & day = zero -> last day in month
            return moment([year, month + 1]).daysInMonth();
        },

        isToday: function (timestamp) {
            return moment().isSame(timestamp, 'day');
        },

        getTime: function (moment) {
            return moment.format('LT');
        },

        getDate: function (timestamp) {
            return moment(timestamp ? timestamp : undefined).format('ddd, l');
        },

        getSmartDate: function (data) {
            var m = data.full_time ? moment.utc(data.start_date).local(true) : moment(data.start_date);
            return m.calendar();
        },

        getEvenSmarterDate: function (data) {
            var m = data.full_time ? moment.utc(data.start_date).local(true) : moment(data.start_date),
                startOfDay = moment().startOf('day');
            // past?
            if (m.isBefore(startOfDay)) {
                if (m.isAfter(startOfDay.subtract(1, 'day'))) {
                    return gt('Yesterday') + ', ' + m.format('l');
                }
                return m.format('ddd, l');
            }
            // future
            if (m.isBefore(startOfDay.add(1, 'days'))) {
                return gt('Today') + ', ' + m.format('l');
            }
            if (m.isBefore(startOfDay.add(1, 'day'))) {
                return gt('Tomorrow') + ', ' + m.format('l');
            }
            return m.format('ddd, l');
        },

        // function that returns markup for date and time + timzonelabel
        getDateTimeIntervalMarkup: function (data, options) {
            if (data && data.start_date && data.end_date) {

                options = _.extend({ timeZoneLabel: { placement: 'top' }, a11y: false, output: 'markup' }, options);

                if (options.container && options.container.parents('#io-ox-core').length < 1) {
                    // view is not in core (happens with deep links)
                    // add timezonepopover to body
                    options.timeZoneLabel.container = 'body';
                }
                var startDate,
                    endDate,
                    dateStr,
                    timeStr,
                    timeZoneStr = gt.noI18n(moment(data.start_date).zoneAbbr()),
                    fmtstr = options.a11y ? 'dddd, l' : 'ddd, l';

                if (data.full_time) {
                    startDate = moment.utc(data.start_date).local(true);
                    endDate = moment.utc(data.end_date).local(true).subtract(1, 'days');
                } else {
                    startDate = moment(data.start_date);
                    endDate = moment(data.end_date);
                }
                if (startDate.isSame(endDate, 'day')) {
                    dateStr = startDate.format(fmtstr);
                    timeStr = this.getTimeInterval(data, options.zone);
                } else if (data.full_time) {
                    dateStr = this.getDateInterval(data);
                    timeStr = this.getTimeInterval(data, options.zone);
                } else {
                    // not same day and not fulltime. use interval with date and time, separate date and is confusing
                    dateStr = startDate.formatInterval(endDate, fmtstr + ' LT');
                }

                // standard markup or object with strings
                if (options.output === 'strings') {
                    return { dateStr: dateStr, timeStr: timeStr || '', timeZoneStr: timeZoneStr };
                }
                return $('<div class="date-time">').append(
                    // date
                    $('<span class="date">').text(dateStr),
                    // mdash
                    $.txt(' \u00A0 '),
                    // time
                    $('<span class="time">').append(
                        timeStr ? $.txt(timeStr) : '',
                        this.addTimezonePopover($('<span class="label label-default pointer" tabindex="0">').text(timeZoneStr), data, options.timeZoneLabel)
                    )
                );
            }
            return '';
        },

        getDateInterval: function (data, a11y) {
            if (data && data.start_date && data.end_date) {
                var startDate, endDate,
                    fmtstr = a11y ? 'dddd, l' : 'ddd, l';

                a11y = a11y || false;

                if (data.full_time) {
                    startDate = moment.utc(data.start_date).local(true);
                    endDate = moment.utc(data.end_date).local(true).subtract(1, 'days');
                } else {
                    startDate = moment(data.start_date);
                    endDate = moment(data.end_date);
                }
                if (startDate.isSame(endDate, 'day')) {
                    return startDate.format(fmtstr);
                }
                if (a11y && data.full_time) {
                    //#. date intervals for screenreaders
                    //#. please keep the 'to' do not use dashes here because this text will be spoken by the screenreaders
                    //#. %1$s is the start date
                    //#. %2$s is the end date
                    //#, c-format
                    return gt('%1$s to %2$s', startDate.format(fmtstr), endDate.format(fmtstr));
                }
                return startDate.formatInterval(endDate, fmtstr);
            }
            return '';
        },

        getDateIntervalA11y: function (data) {
            return this.getDateInterval(data, true);
        },

        getTimeInterval: function (data, zone, a11y) {
            if (!data || !data.start_date || !data.end_date) return '';
            if (data.full_time) {
                return this.getFullTimeInterval(data, true);
            }
            var start = moment(data.start_date),
                end = moment(data.end_date);
            if (zone) {
                start.tz(zone);
                end.tz(zone);
            }
            if (a11y) {
                //#. date intervals for screenreaders
                //#. please keep the 'to' do not use dashes here because this text will be spoken by the screenreaders
                //#. %1$s is the start date
                //#. %2$s is the end date
                //#, c-format
                return gt('%1$s to %2$s', start.format('LT'), end.format('LT'));
            }
            return start.formatInterval(end, 'time');
        },

        getTimeIntervalA11y: function (data, zone) {
            return this.getTimeInterval(data, zone, true);
        },

        getFullTimeInterval: function (data, smart) {
            var length = this.getDurationInDays(data);
            return length <= 1 && smart ? gt('Whole day') : gt.format(
                //#. General duration (nominative case): X days
                //#. %d is the number of days
                //#, c-format
                gt.ngettext('%d day', '%d days', length), length);
        },

        getReminderOptions: function () {
            // TODO: moment.js alternative mode
            // var opt = {};
            // [-1,0,5,10,15,30,45,60,120,240,360,480,720,1440,2880,4320,5760,7200,8640,10080,20160,30240,40320].forEach(function (val) {
            //     opt[val] = val < 0 ? gt('No reminder') : moment.duration(val, 'minutes').humanize();
            // });
            // return opt;

            var reminderListValues = [
                { value: -1, format: 'string' },

                { value: 0, format: 'minutes' },
                { value: 5, format: 'minutes' },
                { value: 10, format: 'minutes' },
                { value: 15, format: 'minutes' },
                { value: 30, format: 'minutes' },
                { value: 45, format: 'minutes' },

                { value: 60, format: 'hours' },
                { value: 120, format: 'hours' },
                { value: 240, format: 'hours' },
                { value: 360, format: 'hours' },
                { value: 480, format: 'hours' },
                { value: 720, format: 'hours' },

                { value: 1440, format: 'days' },
                { value: 2880, format: 'days' },
                { value: 4320, format: 'days' },
                { value: 5760, format: 'days' },
                { value: 7200, format: 'days' },
                { value: 8640, format: 'days' },

                { value: 10080, format: 'weeks' },
                { value: 20160, format: 'weeks' },
                { value: 30240, format: 'weeks' },
                { value: 40320, format: 'weeks' }
                ],
                options = {};

            _(reminderListValues).each(function (item) {
                var i;
                switch (item.format) {
                    case 'string':
                        options[item.value] = gt('No reminder');
                        break;
                    case 'minutes':
                        options[item.value] = gt.format(gt.ngettext('%1$d Minute', '%1$d Minutes', item.value), gt.noI18n(item.value));
                        break;
                    case 'hours':
                        i = Math.floor(item.value / 60);
                        options[item.value] = gt.format(gt.ngettext('%1$d Hour', '%1$d Hours', i), gt.noI18n(i));
                        break;
                    case 'days':
                        i = Math.floor(item.value / 60 / 24);
                        options[item.value] = gt.format(gt.ngettext('%1$d Day', '%1$d Days', i), gt.noI18n(i));
                        break;
                    case 'weeks':
                        i = Math.floor(item.value / 60 / 24 / 7);
                        options[item.value] = gt.format(gt.ngettext('%1$d Week', '%1$d Weeks', i), gt.noI18n(i));
                        break;
                    // no default
                }
            });

            return options;
        },

        onSameDay: function (t1, t2) {
            return moment(t1).isSame(t2, 'day');
        },

        getDurationInDays: function (data) {
            return moment(data.end_date).diff(data.start_date, 'days');
        },

        getStartAndEndTime: function (data) {
            var ret = [];
            if (!data || !data.start_date || !data.end_date) return ret;
            if (data.full_time) {
                ret.push(this.getFullTimeInterval(data, false));
            } else {
                ret.push(moment(data.start_date).format('LT'), moment(data.end_date).format('LT'));
            }
            return ret;
        },

        addTimezoneLabel: function (parent, data, options) {

            var current = moment(data.start_date);

            parent.append(
                $.txt(gt.noI18n(this.getTimeInterval(data))),
                this.addTimezonePopover($('<span class="label label-default pointer" tabindex="0">').text(gt.noI18n(current.zoneAbbr())), data, options)
            );

            return parent;
        },

        addTimezonePopover: function (parent, data, opt) {

            var current = moment(data.start_date);

            opt = _.extend({
                placement: 'left',
                trigger: 'hover focus'
            }, opt);

            function getContent() {
                // hard coded for demo purposes
                var div = $('<ul class="list-unstyled">'),
                    list = settings.get('favoriteTimezones');

                if (!list || list.length === 0) {
                    list = [
                        'America/Los_Angeles',
                        'America/New_York',
                        'Europe/London',
                        'Europe/Berlin',
                        'Australia/Sydney'
                    ];
                }

                _(list).chain().uniq().first(10).each(function (zone) {
                    // get short name (with a few exceptions; see bug 41440)
                    var name = /(North|East|South|West|Central)/.test(zone) ? zone : zone.replace(/^.*?\//, '');
                    // must use outer DIV with "clear: both" here for proper layout in firefox
                    div.append($('<li>').append(
                        $('<span>')
                            .text(gt.noI18n(name.replace(/_/g, ' '))),
                        $('<span>')
                            .addClass('time')
                            .text(gt.noI18n(that.getTimeInterval(data, zone)))
                    ));
                });

                return div;
            }

            function getTitle() {
                return that.getTimeInterval(data) + ' ' + current.zoneAbbr();
            }

            parent.popover({
                container: opt.container || '#io-ox-core',
                viewport: {
                    selector: '#io-ox-core',
                    padding: 10
                },
                content: getContent,
                html: true,
                placement: function (tip) {
                    // add missing outer class
                    $(tip).addClass('timezones');
                    // get placement
                    return opt.placement;
                },
                title: getTitle,
                trigger: opt.trigger
            }).on('blur dispose', function () {
                $(this).popover('hide');
            });

            return parent;
        },

        getShownAsClass: function (data) {
            return shownAsClass[(data.shown_as || 1) - 1];
        },

        getShownAsLabel: function (data) {
            return shownAsLabel[(data.shown_as || 1) - 1];
        },

        getShownAs: function (data) {
            return n_shownAs[(data.shown_as || 1) - 1];
        },

        getConfirmationSymbol: function (status) {
            return n_confirm[status || 0];
        },

        getConfirmationClass: function (status) {
            return confirmClass[status || 0];
        },

        getConfirmationLabel: function (status) {
            return confirmTitles[status || 0];
        },

        getRecurrenceDescription: function (data) {
            function getCountString(i) {
                return n_count[i + 1];
            }

            function getDayString(days) {
                var firstDayOfWeek = moment.localeData().firstDayOfWeek(),
                    tmp = _(_.range(7)).chain().map(function (index) {
                        var mask = 1 << ((index + firstDayOfWeek) % 7);
                        if ((days & mask) !== 0) return moment().weekday(index).format('dddd');
                    }).compact().value();

                var and =
                    //#. recurrence string
                    //#. used to concatenate two weekdays, like Monday and Tuesday
                    gt(' and '),
                    delimiter =
                    //#. This delimiter is used to concatenate a list of string
                    //#. Example: Monday, Tuesday, Wednesday
                    gt(', ');

                return tmp.length === 2 ? tmp.join(and) : tmp.join(delimiter);
            }

            function getMonthString(i) {
                // month names
                return moment.months()[i];
            }

            var str = '',
                interval = data.interval,
                days = data.days || null,
                month = data.month,
                day_in_month = data.day_in_month;

            switch (data.recurrence_type) {

                // DAILY
                case 1:
                    str = interval === 1 ?
                    gt('Every day.') :
                    //#. recurrence string
                    //#. %1$d: numeric
                    gt('Every %1$d days.', interval);
                    break;

                // WEEKLY
                case 2:
                    // special case: weekly but all days checked
                    if (days === 127) {
                        str = interval === 1 ?
                        gt('Every day.') :
                        //#. recurrence string
                        //#. %1$d: numeric
                        gt('Every %1$d weeks on all days.', interval);
                    } else if (days === 62) { // special case: weekly on workdays
                        str = interval === 1 ?
                            //#. recurrence string
                            gt('On workdays.') :
                            //#. recurrence string
                            //#. %1$d: numeric
                            gt('Every %1$d weeks on workdays.', interval);
                    } else if (days === 65) {
                        str = interval === 1 ?
                            //#. recurrence string
                            gt('Every weekend.') :
                            //#. recurrence string
                            //#. %1$d: numeric
                            gt('Every %1$d weeks on weekends.', interval);
                    } else if (days === 0) { // special case when no day is selected
                        str = gt('Never.');
                    } else {
                        str = interval === 1 ?
                        //#. recurrence string
                        //#. %1$s day string, e.g. "workdays" or "Friday" or "Monday, Tuesday, Wednesday"
                        //#. Example: Every Monday, Wednesday, Friday
                        gt('Every %1$s.', getDayString(days)) :
                        //#. recurrence string
                        //#. %1$d: numeric
                        //#. %2$s: day string, e.g. "Friday" or "Monday, Tuesday, Wednesday"
                        gt('Every %1$d weeks on %2$s.', interval, getDayString(days));
                    }

                    break;

                // MONTHLY
                case 3:
                    if (days === null) {
                        str = interval === 1 ?
                        //#. recurrence string
                        //#. %1$d: numeric, day in month
                        //#. Example: Every month on day 5
                        gt('Every month on day %1$d.', day_in_month) :
                        //#. recurrence string
                        //#. %1$d: numeric, interval
                        //#. %1$d: numeric, day in month
                        //#. Example: Every 5 months on day 18
                        gt('Every %1$d months on day %2$d.', interval, day_in_month);
                    } else {
                        str = interval === 1 ?
                        //#. recurrence string
                        //#. %1$s: count string, e.g. first, second, or last
                        //#. %2$s: day string, e.g. Monday
                        //#. Example: Every month on the second Monday
                        gt('Every month on the %1$s %2$s.', getCountString(day_in_month), getDayString(days)) :
                        //#. recurrence string
                        //#. %1$d: numeric, interval
                        //#. %2$s: count string, e.g. first, second, or last
                        //#. %3$s: day string, e.g. Monday
                        //#. Example Every 3 months on the second Tuesday
                        gt('Every %1$d months on the %2$s %3$s.', interval, getCountString(day_in_month), getDayString(days));
                    }

                    break;

                // YEARLY
                case 4:
                    if (days === null) {
                        str =
                        //#. recurrence string
                        //#. %1$s: Month nane, e.g. January
                        //#. %2$d: Date, numeric, e.g. 29
                        //#. Example: Every year in December on day 3
                        gt('Every year in %1$s on day %2$d.', getMonthString(month), day_in_month);
                    } else {
                        str =
                        //#. recurrence string
                        //#. %1$s: count string, e.g. first, second, or last
                        //#. %2$s: day string, e.g. Monday
                        //#. %3$s: month nane, e.g. January
                        //#. Example: Every year on the first Tuesday in December
                        gt('Every year on the %1$s %2$s in %3$d.', getCountString(day_in_month), getDayString(days), getMonthString(month));
                    }

                    break;
                // no default
            }

            return str;
        },

        getRecurrenceEnd: function (data) {
            var str;
            if (data.until) {
                str = gt('The series ends on %1$s.', moment(data.until).format('l'));
            } else if (data.occurrences) {
                var n = data.occurrences;
                str = gt.format(gt.ngettext('The series ends after one occurrence.', 'The series ends after %1$d occurences.', n), n);
            } else {
                str = gt('The series never ends.');
            }

            return str;
        },

        getRecurrenceString: function (data) {
            var str = that.getRecurrenceDescription(data);
            if (data.recurrence_type > 0 && (data.until || data.occurrences)) str += ' ' + that.getRecurrenceEnd(data);
            return str;
        },

        getNote: function (data) {
            var text = $.trim(gt.noI18n(data.note) || '')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/</g, '&lt;');
            //use br to keep linebreaks when pasting (see 38714)
            return util.urlify(text).replace(/\n/g, '<br>');
        },

        getConfirmations: function (data) {
            var hash = {};
            if (data) {
                // internal users
                _(data.users).each(function (obj) {
                    hash[String(obj.id)] = {
                        status: obj.confirmation || 0,
                        comment: obj.confirmmessage || ''
                    };
                });
                // external users
                _(data.confirmations).each(function (obj) {
                    hash[obj.mail] = {
                        status: obj.status || 0,
                        comment: obj.message || obj.confirmmessage || ''
                    };
                });
            }
            return hash;
        },

        getConfirmationStatus: function (obj, id) {
            var hash = this.getConfirmations(obj),
                user = id || ox.user_id;
            return hash[user] ? hash[user].status : 0;
        },

        getConfirmationMessage: function (obj, id) {
            var hash = this.getConfirmations(obj),
                user = id || ox.user_id;
            return hash[user] ? hash[user].comment : '';
        },

        getConfirmationSummary: function (conf) {
            var ret = { count: 0 };
            // init
            _.each(confirmClass, function (cls, i) {
                ret[i] = {
                    icon: n_confirm[i] || '<i class="fa fa-exclamation-circle" aria-hidden="true">',
                    count: 0,
                    css: cls,
                    title: confirmTitles[i] || ''
                };
            });
            _.each(conf, function (c) {
                ret[c.status].count++;
                ret.count++;
            });
            return ret;
        },

        getWeekScaffold: function (timestamp) {
            var day = moment(timestamp).startOf('week'),
                obj,
                ret = { days: [] };
            for (var i = 0; i < 7; i++) {
                ret.days.push(obj = {
                    year: day.year(),
                    month: day.month(),
                    date: day.date(),
                    day: day.day(),
                    timestamp: +day,
                    isToday: moment().isSame(day, 'day'),
                    col: i % 7
                });
                // is weekend?
                obj.isWeekend = obj.day === 0 || obj.day === 6;
                obj.isFirst = obj.date === 1;
                if (obj.isFirst) {
                    ret.hasFirst = true;
                }
                day.add(1, 'days');

                obj.isLast = day.date() === 1;
                if (obj.isLast) {
                    ret.hasLast = true;
                }
            }
            return ret;
        },

        resolveParticipants: function (data) {
            // clone array
            var participants = data.participants.slice(),
                IDs = {
                    user: [],
                    group: [],
                    ext: []
                };

            if (!data.organizerId && _.isString(data.organizer)) {
                participants.unshift({
                    display_name: data.organizer,
                    mail: data.organizer,
                    type: 5
                });
            }

            _.each(participants, function (participant) {
                switch (participant.type) {
                    // internal user
                    case 1:
                        // user API expects array of integer [1337]
                        IDs.user.push(participant.id);
                        break;
                    // user group
                    case 2:
                        // group expects array of object [{ id: 1337 }], yay (see bug 47207)
                        IDs.group.push({ id: participant.id });
                        break;
                    // resource or rescource group
                    case 3:
                    case 4:
                        // ignore resources
                        break;
                    // external user
                    case 5:
                        // external user
                        IDs.ext.push({
                            display_name: participant.display_name,
                            mail: participant.mail,
                            mail_field: 0
                        });
                        break;
                    // no default
                }
            });

            return groupAPI.getList(IDs.group)
                // resolve groups
                .then(function (groups) {
                    _.each(groups, function (single) {
                        IDs.user = _.union(single.members, IDs.user);
                    });
                    return userAPI.getList(IDs.user);
                })
                // add mail to user objects
                .then(function (users) {
                    // add user type 1 to all internal users
                    _.each(users, function (obj) {
                        _.extend(obj, { type: 1 });
                    });
                    // search for external users in contacts
                    var defs = _(IDs.ext).map(function (ext) {
                        return contactAPI.search(ext.mail);
                    });
                    return $.when.apply($, defs).then(function () {
                        _(arguments).each(function (result, i) {
                            if (_.isArray(result) && result.length) {
                                IDs.ext[i] = result[0];
                            }
                        });
                        // combine results with groups and map
                        return _([].concat(IDs.ext, users))
                            .chain()
                            .uniq()
                            .map(function (user) {
                                return $.extend(user, { mail: user.email1, mail_field: 1 });
                            })
                            .value();
                    });
                });
        },

        getUserIdByInternalId: function (internal) {
            return contactAPI.get({ id: internal, folder: 6 }).then(function (data) {
                return data.user_id;
            });
        },

        getAppointmentColorClass: function (folder, appointment) {

            var folderColor = that.getFolderColor(folder),
                appointmentColor = appointment.color_label || 0,
                conf = that.getConfirmationStatus(appointment, folderAPI.is('shared', folder) ? folder.created_by : ox.user_id);

            // shared appointments which are unconfirmed or declined don't receive color classes
            if (/^(unconfirmed|declined)$/.test(that.getConfirmationClass(conf))) return '';

            // private appointments are colored with gray instead of folder color
            if (appointment.private_flag) folderColor = 10;

            // if (folderAPI.is('public', folder) && ox.user_id !== appointment.created_by) {
            //     // public appointments which are not from you are always colored in the calendar color
            //     return 'color-label-' + folderColor;
            // }

            // set color of appointment. if color is 0, then use color of folder
            var color = appointmentColor === 0 ? folderColor : appointmentColor;
            return 'color-label-' + color;
        },

        canAppointmentChangeColor: function (folder, appointment) {
            var appointmentColor = appointment.color_label || 0,
                privateFlag = appointment.private_flag || false,
                conf = that.getConfirmationStatus(appointment, folderAPI.is('shared', folder) ? folder.created_by : ox.user_id);

            // shared appointments which are unconfirmed or declined don't receive color classes
            if (/^(unconfirmed|declined)$/.test(that.getConfirmationClass(conf))) {
                return false;
            }

            return appointmentColor === 0 && !privateFlag;
        },

        getFolderColor: color.getFolderColor,

        getColorLabel: function (colorIndex) {
            if (colorIndex >= 0 && colorIndex < colorLabels.length) {
                return colorLabels[colorIndex];
            }

            return '';
        }
    };

    return that;
});
