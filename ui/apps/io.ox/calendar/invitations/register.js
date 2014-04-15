/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2011 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 */

define('io.ox/calendar/invitations/register',
    ['io.ox/core/extensions',
     'io.ox/core/http',
     'settings!io.ox/calendar',
     'io.ox/calendar/util',
     'gettext!io.ox/calendar/main',
     'io.ox/core/notifications',
     'less!io.ox/calendar/style'
    ], function (ext, http, settings, util, gt, notifications) {

    'use strict';

    var i18n = {
        'accept': gt('Accept'),
        'accept_and_replace': gt('Accept changes'),
        'accept_and_ignore_conflicts': gt('Accept'),
        'accept_party_crasher': gt('Add new participant'),
        'create': gt('Accept'),
        'update': gt('Accept changes'),
        'delete': gt('Delete'),
        'declinecounter': gt('Reject changes'),
        'tentative': gt('Tentative'),
        'decline': gt('Decline'),
        'ignore': gt('Ignore')
    };

    var buttonClasses = {
        'accept': 'btn-success accept',
        'accept_and_replace': 'btn-inverse',
        'accept_and_ignore_conflicts': 'btn-success ignore',
        'accept_party_crasher': 'btn-inverse',
        'create': 'pull-left btn-inverse',
        'update': 'pull-left btn-inverse',
        'delete': 'pull-left btn-inverse',
        'declinecounter': 'pull-left btn-danger',
        'tentative': 'btn-warning',
        'decline': 'btn-danger',
        'ignore': ''
    };

    var success = {
        'accept': gt('You have accepted the appointment'),
        'accept_and_replace': gt('Changes have been saved'),
        'accept_and_ignore_conflicts': gt('You have accepted the appointment'),
        'accept_party_crasher': gt('Added the new participant'),
        'create': gt('You have accepted the appointment'),
        'update': gt('The appointment has been updated'),
        'delete': gt('The appointment has been deleted'),
        'declinecounter': gt('The changes have been rejected'),
        'tentative': gt('You have tentatively accepted the appointment'),
        'decline': gt('You have declined the appointment')
    };

    var successInternal = {
        1: gt('You have accepted the appointment'),
        2: gt('You have declined the appointment'),
        3: gt('You have tentatively accepted the appointment')
    };

    var priority = ['update', 'ignore', 'accept', 'tentative', 'decline', 'declinecounter', 'accept_and_replace', 'accept_and_ignore_conflicts', 'accept_party_crasher', 'create', 'delete'];

    function analyzeIMIPAttachment(imip) {

        if (!imip || !imip.id) return $.Deferred().reject();

        return http.PUT({
            module: 'calendar/itip',
            params: {
                action: 'analyze',
                dataSource: 'com.openexchange.mail.ical',
                descriptionFormat: 'html',
                timezone: 'UTC'
            },
            data: {
                'com.openexchange.mail.conversion.fullname': imip.mail.folder_id,
                'com.openexchange.mail.conversion.mailid': imip.mail.id,
                'com.openexchange.mail.conversion.sequenceid': imip.id
            }
        });
    }

    var AbstractView = Backbone.View.extend({

        className: 'itip-item',

        events: {
            'click .show-details': 'onShowDetails'
        },

        onShowDetails: function (e) {
            e.preventDefault();
            if (this.type === 'appointment') {
                this.showAppointment(e);
            }
        },

        showAppointment: function (e) {
            var data = this.appointment;
            ox.load(['io.ox/core/tk/dialogs', 'io.ox/calendar/view-detail']).done(function (dialogs, view) {
                new dialogs.SidePopup({ tabTrap: true }).show(e, function (popup) {
                    popup.append(view.draw(data));
                });
            });
        },

        renderScaffold: function () {

            var text = this.type !== 'task' ?
                gt('This email contains an appointment') :
                gt('This email contains a task');

            var link = this.type !== 'task' ?
                gt('Show appointment details') :
                gt('Show task details');

            return this.$el.append(
                $('<div class="headline">').append(
                    $('<span>').text(text), $.txt('. '),
                    $('<a href="#" role="button" class="show-details">').text(link)
                ),
                $('<div class="itip-details">'),
                $('<div class="itip-annotations">'),
                $('<div class="itip-changes">'),
                $('<div class="itip-conflicts">'),
                $('<div class="itip-controls">')
            );
        },

        renderConfirmation: function () {

            var data = this.appointment,
                // 0 = none, 1 = accepted, 2 = declined, 3 = tentative
                status = util.getConfirmationStatus(data),
                message = '', className = '';

            if (data.organizerId === ox.user_id) {
                message = gt('You are the organizer');
                className = 'organizer';
                return $('<div class="confirmation-status">').addClass(className).text(message);
            }

            if (status > 0) {
                switch (status) {
                case 1:
                    message = data.type !== 'task' ?
                        gt('You have accepted this appointment') :
                        gt('You have accepted this task');
                    className = 'accepted';
                    break;
                case 2:
                    message = data.type !== 'task' ?
                        gt('You declined this appointment') :
                        gt('You declined this task');
                    className = 'declined';
                    break;
                case 3:
                    message = data.type !== 'task' ?
                        gt('You tentatively accepted this invitation') :
                        gt('You tentatively accepted this task');
                    className = 'tentative';
                    break;
                }
                return $('<div class="confirmation-status">').addClass(className).text(message);
            }

            return $();
        },

        renderSummary: function () {

            var data = this.appointment,
                recurrenceString = util.getRecurrenceString(data),
                separator = data.title ? $.txt(', ') : $.txt('');

            this.$el.find('.itip-details').append(
                $('<b>').text(data.title), separator,
                $('<span class="day">').append(
                    $.txt(gt.noI18n(util.getDateInterval(data))),
                    $.txt(gt.noI18n((recurrenceString !== '' ? ' \u2013 ' + recurrenceString : '')))
                ),
                // confirmation
                this.renderConfirmation()
            );
        },

        renderAnnotations: function () {
        },

        renderChanges: function () {
        },

        renderConflicts: function () {
        },

        renderReminder: function () {
        },

        getActions: function () {
            return ['decline', 'tentative', 'accept'];
        },

        getAppointment: function () {
            return this.appointment;
        },

        getButtons: function (actions) {
            return _(priority).chain()
                .filter(function (action) {
                    return _(actions).contains(action);
                })
                .map(function (action) {
                    var button = $('<button type="button" class="btn btn-default">')
                        .attr('data-action', action)
                        .addClass(buttonClasses[action])
                        .text(i18n[action]);
                    return button
                        .add($('<span>').text('\u00A0'))
                        .addClass(button.hasClass('pull-left') ? 'pull-left' : '');
                })
                .value();
        },

        getConfirmationSelector: function (status) {
            if (status === 1) return 'button.btn-success.accept';
            if (status === 2) return 'button.btn-danger';
            if (status === 3) return 'button.btn-warning';
            return '';
        },

        render: function () {

            this.$el.empty().fadeIn(300);

            var actions = this.getActions(), status, selector, accepted, buttons;

            this.renderScaffold();
            this.renderAnnotations();

            this.appointment = this.getAppointment();
            if (!this.appointment) {
                // remove "Show appointment" link
                this.$el.find('.show-details').remove();
                return this;
            }

            this.renderSummary();
            this.renderChanges();
            this.renderConflicts();

            status = util.getConfirmationStatus(this.appointment);
            selector = this.getConfirmationSelector(status);
            accepted = status === 1;

            // don't offer standard buttons if appointment is already accepted
            if (accepted) actions = _(actions).without('decline', 'tentative', 'accept');

            // get standard buttons
            buttons = this.getButtons(actions);
            if (buttons.length === 0) return this;
            // use doesn't need any controls to "ignore" the message
            if (actions.length === 1 && actions[0] === 'ignore') return this;

            this.$el.find('.itip-controls').append(
                $('<div class="itip-actions">').append(buttons)
                // disable buttons - don't know why we have an array of appointments but just one set of buttons
                // so, let's use the first one
                .find(selector).addClass('disabled').prop('disabled', true).end()
            );

            this.renderReminder();

            return this;
        },

        dispose: function () {
            this.stopListening();
            this.model = this.options = null;
        }
    });

    //
    // External invitations
    //

    var ExternalView = AbstractView.extend({

        events: {
            'click .show-details': 'onShowDetails',
            'click .show-conflicts': 'onShowConflicts',
            'click .itip-actions button': 'onAction'
        },

        onAction: function (e) {

            e.preventDefault();

            var action = $(e.currentTarget).attr('data-action'), self = this;

            http.PUT({
                module: 'calendar/itip',
                params: {
                    action: action,
                    dataSource: 'com.openexchange.mail.ical',
                    descriptionFormat: 'html'
                },
                data: {
                    'com.openexchange.mail.conversion.fullname': this.imip.mail.folder_id,
                    'com.openexchange.mail.conversion.mailid': this.imip.mail.id,
                    'com.openexchange.mail.conversion.sequenceid': this.imip.id
                }
            })
            .then(
                function done() {
                    // api refresh
                    require(['io.ox/calendar/api']).then(function (api) {
                        api.refresh();
                        notifications.yell('success', success[action]);
                        self.repaint();
                    });
                },
                function fail(e) {
                    notifications.yell(e);
                    self.repaint();
                }
            );
        },

        onShowConflicts: function (e) {
            e.preventDefault();
            var data = $(e.currentTarget).data(), node = this.$el.find('.itip-conflicts');
            ox.load(['io.ox/calendar/conflicts/conflictList']).done(function (conflictView) {
                node.empty().append(conflictView.drawList(data.conflicts));
            });
        },

        initialize: function (options) {
            this.type = 'appointment';
            this.imip = options.imip;
            this.$el.hide();
        },

        getActions: function () {
            return this.model.get('actions');
        },

        getAnnotations: function () {
            return _(this.model.get('annotations'))
                .chain()
                .pluck('message')
                .compact()
                .value();
        },

        getAppointment: function () {
            // extract appointments data from changes
            return _(this.model.get('changes'))
                .chain()
                .map(function (change) {
                    return change.deletedAppointment || change.newAppointment || change.currentAppointment;
                })
                .compact()
                .first()
                .value();
        },

        renderAnnotations: function () {
            // ignore annotations for requests
            // if (this.model.get('messageType') === 'request') return;
            // -- don't know why this message type should be skipped;
            // still helpful to get an annotataion
            var node = this.$el.find('.itip-annotations');
            _(this.getAnnotations()).each(function (annotation) {
                node.append(
                    $('<div class="annotation">').html(annotation)
                );
            });
        },

        renderChanges: function () {
            var node = this.$el.find('.itip-changes');
            return _(this.model.get('changes')).each(function (change) {
                if (!change.diffDescription) return;
                _(change.diffDescription).each(function (description) {
                    node.append($('<p>').html(description));
                });
            });
        },

        renderConflicts: function () {
            var node = this.$el.find('.itip-conflicts');
            _(this.model.get('changes')).each(function (change) {
                if (!change.conflicts) return;
                var text = gt.format(gt.ngettext('There is already %1$d appointment in this timeframe.',
                    'There are already %1$d appointments in this timeframe.', change.conflicts.length), change.conflicts.length);
                node.append(
                    $('<div class="conflict">').append(
                        $('<span>').text(text), $.txt(' '),
                        $('<a href="#" class="show-conflicts">')
                        .data({ conflicts: change.conflicts })
                        .text(gt('Show conflicts'))
                    )
                );
            });
        },

        repaint: function () {
            analyzeIMIPAttachment(this.imip).done(this.render.bind(this));
        }
    });

    //
    //  Internal invitations
    //

    var InternalView = AbstractView.extend({

        events: {
            'click .show-details': 'onShowDetails',
            'click button': 'onAction'
        },

        initialize: function (options) {
            this.listenTo(this.model, 'change:headers', this.render);
            this.$el.on('dispose', this.dispose.bind(this));
            this.cid = options.cid;
            this.type = options.type === 'Appointments' ? 'appointment' : 'task';
            this.appointment = {};
            this.$el.hide();
        },

        onActionSuccess: function (action, updated) {

            var data = this.appointment || this.task,
                status = util.getConfirmationStatus(data),
                accepted = status === 1,
                reminder, tempdata, dep;

            if (!accepted) {
                reminder = parseInt(this.$el.find('.reminder-select').val(), 10);
                if (reminder !== this.getDefaultReminder()) {
                    // don't use whole data object here, because it overwrites the confirmations with it's users attribute
                    tempdata = {
                        id: data.id,
                        folder_id: data.folder_id,
                        alarm: reminder
                    };
                    if (data.recurrence_position) {
                        tempdata.recurrence_position = data.recurrence_position;
                    }
                    if (this.task) {//tasks use absolute timestamps
                        tempdata.alarm = _.utc() + tempdata.alarm;
                    }
                    this.api.update(tempdata);
                }
            }

            if (this.type === 'appointment') {
                this.appointment = updated;
                dep =  'settings!io.ox/calendar';
            } else {
                this.task = updated;
                dep = 'settings!io.ox/tasks';
            }

            require(['io.ox/mail/api', dep], function (api, settings) {
                if (settings.get('deleteInvitationMailAfterAction')) {
                    // remove mail
                    notifications.yell('success', successInternal[action]);
                    this.api.remove([this.data]);
                } else {
                    // update well
                    this.$el.idle();
                    this.render();
                }
            }.bind(this));
        },

        onActionFail: function () {
            // appointment or task was deleted in the meantime
            this.$el.idle().hide();
            notifications.yell('error',
                this.type === 'appointment' ?
                gt('Failed to update confirmation status; most probably the appointment has been deleted.') :
                gt('Failed to update confirmation status; most probably the task has been deleted.')
            );
        },

        onAction: function (e) {

            this.$el.empty().busy();
            var action = $(e.currentTarget).attr('data-action'),
                hash = { accept: 1, decline: 2, tentative: 3 },
                confirmation = hash[action],
                data = this.appointment || this.task;

            this.api.confirm({
                folder: data.folder_id,
                id: data.id,
                data: { confirmation: confirmation }
            })
            .then(this.onActionSuccess.bind(this, action), this.onActionFail.bind(this, action));
        },

        loadAppointment: function () {
            var view = this;
            return require(['io.ox/calendar/api', 'settings!io.ox/calendar']).then(function (api, settings) {
                view.api = api;
                view.settings = settings;
                return api.get(_.cid(view.cid)).then(
                    function success(appointment) {
                        view.appointment = appointment;
                        view.render = AbstractView.prototype.render;
                        view.render();
                        return appointment;
                    }
                );
            });
        },

        renderAppointment: function () {
            this.loadAppointment();
        },

        loadTask: function () {
            var view = this;
            return require(['io.ox/tasks/api', 'settings!io.ox/tasks']).then(function (api, settings) {
                view.api = api;
                view.settings = settings;
                return api.get(_.cid(view.cid)).then(
                    function success(data) {
                        view.task = data;
                        view.render = AbstractView.prototype.render;
                        view.render();
                        return data;
                    }
                );
            });
        },

        renderTask: function () {
            this.loadTask();
        },

        getDefaultReminder: function () {
            return parseInt(this.settings.get('defaultReminder', 15), 10);
        },

        renderReminder: function () {
            this.$el.find('.itip-actions').before(
                $('<div class="itip-reminder">').append(
                    $('<label class="control-label" for="reminderSelect">').text(gt('Reminder')),
                    $('<div class="controls">').append(
                        $('<select id="reminderSelect" data-property="reminder" class="reminder-select form-control">')
                        .append(function () {
                            var self = $(this),
                                options = util.getReminderOptions();
                            _(options).each(function (label, value) {
                                self.append($('<option>', { value: value }).text(label));
                            });
                        })
                        .val(this.getDefaultReminder())
                    )
                )
            );
        },

        render: function () {
            this.$el.attr({ 'data-type': this.type, 'data-cid': this.cid });
            if (this.type === 'appointment') this.loadAppointment(); else this.loadTask();
            return this;
        }
    });

    //
    // Container view. Checks mail data and adds internal or external view
    //

    var ItipView = Backbone.View.extend({

        className: 'itip',

        initialize: function () {
            // if headers are already available, call update()
            // otherwise wait for model change
            if (this.model.has('headers')) {
                this.update();
            } else {
                this.listenToOnce(this.model, 'change:headers', this.update);
            }
            this.$el.on('dispose', this.dispose.bind(this));
        },

        getIMIPAttachment: function () {
            var regex = /text\/calendar.*?method=(.+)/i;
            // loop over attachments to find first attachment with mime-type text/calendar
            return _(this.model.get('attachments')).find(function (attachment) {
                var match = attachment.content_type.match(regex), index, method;
                if (match && match[1].toLowerCase() !== 'publish') {
                    index = match[1].indexOf(';');
                    method = index !== -1 ? match[1].substr(0, index) : match[1];
                    return method.toLowerCase() !== 'publish';
                }
                return false;
            });
        },

        update: function () {

            var headers, reminder, type, cid, $el = this.$el, imip;

            // external?
            if ((imip = this.getIMIPAttachment())) {
                imip.mail = { folder_id: this.model.get('folder_id'), id: this.model.get('id') };
                return analyzeIMIPAttachment(imip).done(function (analyses) {
                    _(analyses).each(function (analysis) {
                        var model = new Backbone.Model(analysis),
                            view = new ExternalView({ model: model, imip: imip });
                        $el.append(view.render().$el);
                    });
                });
            }

            // internal
            // check if we already have all required data
            if (!(headers = this.model.get('headers'))) return;
            if (!(reminder = headers['X-OX-Reminder'])) return;
            if (!(type = headers['X-Open-Xchange-Module'])) return;

            // get the object id
            reminder = reminder.split(/,\s*/);
            cid = reminder[1] + '.' + reminder[0];

            this.$el.append(
                new InternalView({ model: this.model, cid: cid, type: type }).render().$el
            );
        },

        render: function () {
            return this;
        },

        dispose: function () {
            this.stopListening();
            this.model = this.options = null;
        }
    });

    ext.point('io.ox/mail/detail/notifications').extend({
        index: 'last',
        id: 'accept-decline',
        draw: function (baton) {
            var view = new ItipView({ model: baton.model });
            this.append(view.render().$el);
        }
    });
});
