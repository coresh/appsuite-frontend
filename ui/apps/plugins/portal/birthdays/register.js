/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2012 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 */

define('plugins/portal/birthdays/register',
    ['io.ox/core/extensions',
     'io.ox/contacts/api',
     'io.ox/core/date',
     'io.ox/contacts/util',
     'gettext!plugins/portal',
     'settings!io.ox/core',
     'less!plugins/portal/birthdays/style.less'
    ], function (ext, api, date, util, gt, settings) {

    'use strict';

    var WEEKS = 12,
        sidepopup;

    function unifySpelling(name) {
        // lowercase & transform umlauts
        return String(name).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    }

    function markDuplicate(name, hash) {
        name = unifySpelling(name);
        hash[name] = true;
    }

    function isDuplicate(name, hash) {
        name = unifySpelling(name);
        return name in hash;
    }

    ext.point('io.ox/portal/widget/birthdays').extend({

        title: gt('Next birthdays'),

        load: function (baton) {
            var aDay = 24 * 60 * 60 * 1000,
                start = _.now() - aDay, // yes, one could try to calculate 00:00Z this day, but hey...
                end = start + WEEKS * aDay * 7;
            return api.birthdays({ start: start, end: end, right_hand_limit: 25 }).done(function (data) {
                baton.data = data;
            });
        },

        preview: function (baton) {

            var $list = $('<div class="content">'),
                hash = {},
                contacts = baton.data,
                numOfItems = _.device('small') ? 5 : 15;

            // ignore broken birthdays
            contacts = _(contacts).filter(function (contact) {
                // null, undefined, empty string, 0 (yep 1.1.1970).
                return !!contact.birthday;
            });

            if (contacts.length === 0) {
                $list.append(
                    $('<div class="line">').text(gt('No birthdays within the next %1$d weeks', WEEKS))
                );
            } else {
                $list.addClass('pointer');
                _(contacts.slice(0, numOfItems)).each(function (contact) {
                    var birthday = new date.UTC(contact.birthday),
                        name = util.getFullName(contact);
                    if (birthday.getYear() === 1) {//Year 0 is special for birthdays without year (backend changes this to 1...)
                        birthday = birthday.format(date.DATE_NOYEAR);
                    } else {
                        birthday = birthday.format(date.DATE);
                    }

                    if (!isDuplicate(name, hash)) {
                        $list.append(
                            $('<div class="line">').append(
                                $('<span class="bold">').text(name), $.txt(' '),
                                $('<span class="accent">').text(_.noI18n(birthday))
                            )
                        );
                        markDuplicate(name, hash);
                    }
                });
            }

            this.append($list);
        },

        draw: function (baton) {

            var hash = {}, $list;

            $list = $('<div class="io-ox-portal-birthdays">').append(
                $('<h1>').text(gt('Next birthdays'))
            );

            if (baton.data.length === 0) {
                $list.append(
                    $('<div>').text(gt('No birthdays within the next %1$d weeks', WEEKS))
                );
            } else {
                // add buy-a-gift
                var url = $.trim(settings.get('customLocations/buy-a-gift', 'http://www.amazon.com/'));
                if (url !== 'none' && url !== '') {
                    $list.append(
                        $('<div class="buy-a-gift">').append(
                            $('<a>', { href: url, target: '_blank', title: gt('External link') }).text(gt('Buy a gift')),
                            $.txt(' '),
                            $('<i class="icon-external-link">')
                        )
                    );
                }
                // loop
                _(baton.data).each(function (contact) {
                    var utc = date.Local.utc(contact.birthday), birthday, next, now, days, delta,
                        // we use fullname here to avoid haveing duplicates like "Jon Doe" and "Doe, Jon"
                        name = util.getFullName(contact);

                    if (!isDuplicate(name, hash)) {

                        // get delta
                        now = new date.Local();
                        birthday = new date.Local(utc);
                        next = new date.Local(now.getYear(), birthday.getMonth(), birthday.getDate());
                        //add 23h 59min and 59s, so it refers to the end of the day
                        next.add(date.DAY - 1);
                        // inc year?
                        if (next < now) next.addYears(1);
                        // get human readable delta
                        days = birthday.getDate() - now.getDate();
                        delta = (next - now) / date.DAY;
                        delta = days === 0 && delta <= 1 ? gt('Today') : days === 1 && delta <= 2 ? gt('Tomorrow') : gt('In %1$d days', Math.ceil(delta));

                        $list.append(
                            $('<div class="birthday">').data('contact', contact).append(
                                api.getPicture(contact, { width: 48, height: 48, scaleType: 'cover' }).addClass('picture'),
                                $('<div class="name">').text(_.noI18n(name)),
                                $('<div>').append(
                                    $('<span class="date">').text(_.noI18n(birthday.format(birthday.getYear() === 1 ? date.DATE_NOYEAR : date.DATE))), $.txt(' '),
                                    $('<span class="distance">').text(delta)
                                )
                            )
                        );
                        markDuplicate(name, hash);
                    }
                });
                // init sidepopup
                require(['io.ox/core/tk/dialogs'], function (dialogs) {
                    sidepopup = sidepopup || new dialogs.SidePopup({ modal: false });
                    sidepopup.delegate($list, '.birthday', function (popup, e, target) {
                        var data = target.data('contact');
                        require(['io.ox/contacts/view-detail'], function (view) {
                            api.get(api.reduce(data)).done(function (data) {
                                popup.append(view.draw(data));
                            });
                        });
                    });
                });
            }
            this.append($list);
        }
    });

    ext.point('io.ox/portal/widget/birthdays/settings').extend({
        title: gt('Next birthdays'),
        type: 'birthdays',
        editable: false,
        unique: true
    });
});
