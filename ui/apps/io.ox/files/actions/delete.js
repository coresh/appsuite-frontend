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

define('io.ox/files/actions/delete', [
    'io.ox/files/api',
    'io.ox/core/folder/api',
    'io.ox/core/tk/dialogs',
    'io.ox/core/notifications',
    'gettext!io.ox/files'
], function (api, folderAPI, dialogs, notifications, gt) {

    'use strict';

    function isFile(o) {
        // isFile is only defined on file models
        return o.isFile && o.isFile();
    }

    function process(list) {

        var items = _(list).filter(isFile),
            folders = _(list).reject(isFile);

        // delete files
        api.remove(_(items).invoke('toJSON')).fail(function (e) {
            if (e && e.code && e.code === 'IFO-0415') {
                notifications.yell('error', gt.ngettext(
                    'This file has not been deleted, as it is locked by its owner.',
                    'These files have not been deleted, as they are locked by their owner.',
                    list.length
                ));
            } else {
                notifications.yell('error', gt.ngettext(
                    'This file has not been deleted',
                    'These files have not been deleted',
                    list.length
                ) + '\n' + e.error);
            }
        });

        // delete folders
        folderAPI.remove(_(folders).map(function (model) {
            return model.get('id');
        }));
    }

    return function (list) {

        var dialog = new dialogs.ModalDialog(),
            deleteNotice = gt.ngettext(
                'Do you really want to delete this item?',
                'Do you really want to delete these items?',
                list.length
            ),
            shareNotice = gt.ngettext('This file (or folder) is shared with others. It won\'t be available for them any more.',
                'Some files/folder are shared with others. They won\'t be available for them any more.',
                list.length
            );

        list = _.isArray(list) ? list : [list];

        function isShared() {
            var result = _.findIndex(list, function (model) {
                return model.get('object_permissions') ? model.get('object_permissions').length !== 0 : model.get('permissions').length > 1;
            });

            if (result !== -1) return true;
        }

        dialog.text(deleteNotice)
            .append($('<p>').text(isShared() ? shareNotice : ''))
            .addPrimaryButton('delete', gt('Delete'), 'delete')
            .addButton('cancel', gt('Cancel'), 'cancel')
            .on('delete', function () {
                _.defer(function () { process(list); });
            })
            .show();
        dialog.getContentNode().find('h4').addClass('white-space');
    };
});