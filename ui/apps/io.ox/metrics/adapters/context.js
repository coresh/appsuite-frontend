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
 * @author Frank Paczynski <frank.paczynski@open-xchange.com>
 */

define('io.ox/metrics/adapters/context', [
    'settings!io.ox/core',
    'io.ox/core/extensions'
], function (settings, ext) {

    'use strict';

    if (!settings.get('tracking/context/enabled', false)) return;

    // localstorage event 'database'
    var point = ext.point('io.ox/metrics/adapter'),
        maxlength = 10,
        store = {},
        list;

    _.extend(store, {
        init: function () {
            if (list) return;
            list = JSON.parse(
                localStorage.getItem('metrics.adapter.context.storage') || '[]'
            );
        },
        show: function () {
            if (!console.table) return;
            console.table(list);
        },
        get: function () {
            return _.clone(list);
        },
        save: function () {
            localStorage.setItem(
                'metrics.adapter.context.storage',
                JSON.stringify(list)
            );
        },
        reset: function () {
            list = [];
            store.save();
        },
        add: function (type, baton) {
            baton = baton || {};
            var id = baton.id || type;
            // add to store
            list = list || [];
            // queue with max length
            list.unshift({
                time: moment(moment.now()).format('HH:mm:ss:SS'),
                id: id,
                type: type
            });
            list.splice(maxlength, 1);
            // save to localstorage
            store.save();
        }
    });

    // for debugging
    window.ox.metrics = store;

    point.extend({
        id: 'context',
        setup: function () {
            store.init();
            store.add('setup');
        },
        trackEvent: function (baton) {
            store.add('trackEvent', baton);
        },
        trackVisit: function (baton) {
            store.add('trackVisit', baton);
        },
        trackPage: function (baton) {
            store.add('trackPage', baton);
        }
    });

});
