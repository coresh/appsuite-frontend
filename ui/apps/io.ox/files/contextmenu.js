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
 * @author Jonas Regier <jonas.regier@open-xchange.com>
 */

define('io.ox/files/contextmenu', ['io.ox/core/extensions', 'gettext!io.ox/core'], function (ext, gt) {

    'use strict';

    var points = {
        // favorites use the same contextmenu as main list view
        'io.ox/files/listview/contextmenu': [
            // #1
            //#. used as a verb here. label of a button to view files
            ['viewer', '10', gt('View')],
            // #2
            ['favorites/add', '20', gt('Add to favorites')],
            ['favorites/remove', '20', gt('Remove from favorites')],
            ['show-in-folder', '20', gt('Show in Drive')],
            //#3
            ['download', '30', gt('Download')],
            ['download-folder', '30', gt('Download entire folder')],
            // #4
            ['invite', '40', gt('Permissions / Invite people')],
            ['getalink', '40', gt('Create sharing link')],
            // #5
            ['rename', '50', gt('Rename')],
            ['move', '50', gt('Move')],
            ['copy', '50', gt('Copy')],
            // #6
            ['send', '60', gt('Send by email')],
            ['save-as-pdf', '60', gt('Save as PDF')],
            // #7
            ['delete', '70', gt('Delete')],
            ['restore', '70', gt('Restore')]
        ],
        'io.ox/files/share/myshares/listview/contextmenu': [
            ['editShare', '10', gt('Edit Share')],
            ['show-in-folder', '10', gt('Show in Drive')],
            ['revoke', '20', gt('Revoke access')]
        ]
    };

    _(points).each(function (items, point) {
        ext.point(point).extend(
            items.map(function (item, index) {
                return {
                    id: item[0],
                    index: 100 + index * 100,
                    title: item[2],
                    ref: 'io.ox/files/actions/' + item[0],
                    section: item[1]
                };
            })
        );
    });
});
