/**
 * All content on this website (including text, images, source code and any
 * other original works), unless otherwise noted, is licensed under a Creative
 * Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2011 Mail: info@open-xchange.com
 *
 * @author Christoph Kopp <christoph.kopp@open-xchange.com>
 */

define('io.ox/mail/mailfilter/settings/view-form', [
    'io.ox/mail/mailfilter/settings/model',
    'io.ox/backbone/views',
    'io.ox/backbone/forms',
    'io.ox/core/extPatterns/actions',
    'io.ox/core/extPatterns/links',
    'gettext!io.ox/mail',
    'less!io.ox/mail/mailfilter/settings/style.css'
], function (model, views, forms, actions, links, gt) {

    "use strict";

    function createVacationEdit(ref) {
        var point = views.point(ref + '/edit/view'),
            VacationEditView = point.createView({
                tagName: 'div',
                className: 'edit-vacation'

            });

        point.extend(new forms.Header({
            index: 50,
            id: 'headline',
            label: gt('Vacation Notice')

        }));

        // Show backend errors
        point.extend(new forms.ErrorAlert({
            id: ref + '/edit/view/backendErrors',
            className: 'span7',
            index: 100,
            customizeNode: function () {
                this.$el.css({
                    marginTop: '15px'
                });
            }
        }));


        point.extend(new forms.CheckBoxField({
            id: ref + '/edit/view/active',
            index: 250,
            label: model.fields.active,
            attribute: 'active',
            customizeNode: function () {
                this.$el.css({
                    clear: 'both'
                });
            }

        }));

        point.extend(new forms.ControlGroup({
            id: ref + '/edit/view/subject',
            index: 250,
            label: model.fields.subject,
            control: '<input type="text" class="input-xlarge" name="subject">',
            attribute: 'subject'
        }));

        point.extend(new forms.ControlGroup({
            id: ref + '/edit/view/mailtext',
            index: 250,
            label: model.fields.text,
            control: '<textarea rows="12" class="span6" name="text">',
            attribute: 'text'
        }));

        point.extend(new forms.SelectBoxField({
            id: ref + '/edit/view/days',
            index: 250,
            label: model.fields.days,
            attribute: 'days',
            selectOptions: {1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8'}
        }));

//        point.extend(new forms.DateControlGroup({
//            id: ref + '/edit/view/dateFrom',
//            index: 250,
//            label: 'Date from',
//            attribute: 'dateFrom'
//        }));
//
//        point.extend(new forms.DateControlGroup({
//            id: ref + '/edit/view/dateUntil',
//            index: 250,
//            label: 'Date until',
//            attribute: 'dateUntil'
//        }));


        var index = 400;

        return VacationEditView;
    }

    return {
        protectedMethods: {
            createVacationEdit: createVacationEdit
        }
    };

});
