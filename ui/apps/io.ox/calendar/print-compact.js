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
 * @author Daniel Dickhaus <daniel.dickhaus@open-xchange.com>
 */

define('io.ox/calendar/print-compact', [
    'io.ox/core/print',
    'io.ox/calendar/api',
    'io.ox/calendar/util',
    'io.ox/core/api/group',
    'gettext!io.ox/calendar'
], function (print, api, util, groupAPI, gt) {

    'use strict';

    function getDate(data) {
        var strings = util.getDateTimeIntervalMarkup(data, { output: 'strings' });
        return strings.dateStr + ' ' + strings.timeStr;
    }

    function process(data) {
        return {
            original: data,
            subject: data.get('summary'),
            location: $.trim(data.get('location')),
            date: getDate(data.attributes),
            participants: _(data.get('attendees')).where({ cuType: 'INDIVIDUAL' }).concat(_(data.attendees).where({ cuType: undefined })).length
        };
    }

    return {

        open: function (selection, win) {

            print.smart({

                get: function (obj) {
                    return api.get(obj);
                },

                i18n: {
                    location: gt('Location'),
                    participants: gt('Participants')
                },

                title: selection.length === 1 ? selection[0].get('summary') : undefined,

                process: process,
                selection: selection,
                selector: '.appointment-compact',
                window: win
            });
        }
    };
});
