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
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 */

define('io.ox/core/tk/attachments', [
    'io.ox/backbone/disposable',
    'io.ox/core/api/attachment',
    'io.ox/core/folder/title',
    'io.ox/core/strings',
    'io.ox/core/tk/attachmentsUtil',
    'io.ox/core/capabilities',
    'io.ox/preview/main',
    'io.ox/core/tk/dialogs',
    'io.ox/core/extPatterns/links',
    'settings!io.ox/core',
    'io.ox/core/notifications',
    'gettext!io.ox/core',
    'io.ox/core/pim/actions'
], function (DisposableView, attachmentAPI, shortTitle, strings, util, capabilities, pre, dialogs, links, settings, notifications, gt) {

    'use strict';

    // EditableAttachmentList is only used by tasks and calendar
    function EditableAttachmentList(options) {
        var counter = 0;

        _.extend(this, {

            init: function () {
                var self = this;
                this.attachmentsToAdd = [];
                this.attachmentsToDelete = [];
                this.attachmentsOnServer = [];

                this.allAttachments = [];

                this.loadAttachments();

                function uploadOnSave(response) {
                    response = response || {};
                    self.model.off('create update', uploadOnSave);
                    var id = response.id || self.model.attributes.id,
                        folder = self.model.attributes.folder || self.model.attributes.folder_id;
                    // todo remove this once we get a upload request in the chronos api
                    // until then cut off the additional cal://0/ etc from the folder
                    folder = folder.split('/');
                    folder = folder[folder.length - 1];
                    if (folder && id) {
                        self.save(id, folder);
                    }
                }

                this.model.on('create update', uploadOnSave);
            },

            finishedCallback: function (model) {
                model.trigger('finishedAttachmentHandling');
            },

            render: function () {
                var self = this;
                this.$el.empty();
                _(this.allAttachments).each(function (attachment) {
                    //clearfix because all attachments have css float
                    self.$el.addClass('io-ox-core-tk-attachment-list clearfix').append(self.renderAttachment(attachment));
                });

                //trigger refresh of attachmentcounter
                this.baton.parentView.trigger('attachmentCounterRefresh', this.allAttachments.length);

                return this;
            },

            renderAttachment: function (attachment) {
                var self = this;
                var size, removeFile;
                var $el = $('<div class="col-lg-6 col-md-6">').append(
                    $('<div class="io-ox-core-tk-attachment file">').append(
                        $('<i class="fa fa-paperclip">'),
                        $('<div class="row-1">').text(_.ellipsis(attachment.filename, { max: 40, charpos: 'middle' })),
                        $('<div class="row-2">').append(
                            size = $('<span class="filesize">').text(strings.fileSize(attachment.file_size || attachment.size))
                        ),
                        removeFile = $('<a href="#" class="remove">').attr('title', gt('Remove attachment')).append($('<i class="fa fa-trash-o">'))
                    )
                );

                removeFile.on('click', function () { self.deleteAttachment(attachment); });

                if (size.text() === '0 B') size.text(' ');

                return $el;
            },

            loadAttachments: function () {
                // chronos model already has the full data
                if (options.module === 'chronos') {
                    this.attachmentsOnServer = this.model.get('attachments') || [];
                    this.updateState();
                    return;
                }

                var self = this;
                if (this.model.id) {
                    attachmentAPI.getAll({ module: options.module, id: this.model.id, folder: this.model.get('folder') || this.model.get('folder_id') }).done(function (attachments) {
                        self.attachmentsOnServer = attachments;
                        self.updateState();
                    });
                }
            },

            checkQuota: function () {
                var properties = settings.get('properties'),
                    size = this.attachmentsToAdd.reduce(function (acc, attachment) {
                        return acc + (attachment.file_size || 0);
                    }, 0),
                    max = properties.attachmentMaxUploadSize;
                if (max && max > 0 && size > max) {
                    this.model.set('quotaExceeded', {
                        actualSize: size,
                        attachmentMaxUploadSize: properties.attachmentMaxUploadSize
                    });
                } else {
                    this.model.unset('quotaExceeded');
                }
            },

            updateState: function () {
                var self = this;
                this.allAttachments = _(this.attachmentsOnServer.concat(this.attachmentsToAdd)).reject(function (attachment) {
                    return _(self.attachmentsToDelete).any(function (toDelete) {
                        if (attachment.managedId) {
                            return toDelete.managedId === attachment.managedId;
                        }
                        return toDelete.id === attachment.id;
                    });
                });
                this.checkQuota();
                this.render();
            },

            addFile: function (file) {
                this.addAttachment({ file: file, newAttachment: true, cid: counter++, filename: file.name, file_size: file.size });
            },

            addAttachment: function (attachment) {
                this.attachmentsToAdd.push(attachment);
                this.updateState();
            },

            deleteAttachment: function (attachment) {
                if (attachment.newAttachment) {
                    this.attachmentsToAdd = _(this.attachmentsToAdd).reject(function (att) {
                        return att.cid === attachment.cid;
                    });
                } else {
                    this.attachmentsToDelete.push(attachment);
                }
                this.updateState();
            },

            save: function (id, folderId) {
                var self = this,
                    //errors are saved and send to callback
                    errors = [],
                    // 0 ready 1 delete 2 add 3 delete and add
                    allDone = 0,
                    apiOptions = {
                        module: this.module,
                        id: id || this.model.id,
                        folder: folderId || this.model.get('folder') || this.model.get('folder_id')
                    };
                if (this.attachmentsToDelete.length) {
                    allDone++;
                }
                if (this.attachmentsToAdd.length) {
                    allDone += 2;
                }

                if (this.attachmentsToDelete.length) {
                    attachmentAPI.remove(apiOptions, _(this.attachmentsToDelete).pluck('id')).fail(function (resp) {
                        self.model.trigger('backendError', resp);
                        errors.push(resp);
                        allDone--;
                        if (allDone <= 0) { self.finishedCallback(self.model, id, errors); }
                    }).done(function () {
                        allDone--;
                        if (allDone <= 0) { self.finishedCallback(self.model, id, errors); }
                    });
                }

                if (this.attachmentsToAdd.length) {
                    attachmentAPI.create(apiOptions, _(this.attachmentsToAdd).pluck('file')).fail(function (resp) {
                        self.model.trigger('backendError', resp);
                        errors.push(resp);
                        allDone -= 2;
                        if (allDone <= 0) { self.finishedCallback(self.model, id, errors); }
                    }).done(function () {
                        allDone -= 2;
                        if (allDone <= 0) { self.finishedCallback(self.model, id, errors); }
                    });
                }

                if (allDone <= 0) {
                    self.finishedCallback(self.model, id, errors);
                }

                this.attachmentsToAdd = [];
                this.attachmentsToDelete = [];
                this.attachmentsOnServer = [];
                this.allAttachments = [];
            }

        }, options);
    }


    function AttachmentListOld(options) {
        var self = this;
        _.extend(this, {

            draw: function (baton) {
                if (self.processArguments) {
                    baton = self.processArguments.apply(this, $.makeArray(arguments));
                }

                var $node = $('<div>').addClass('attachment-list').appendTo(this);

                function drawAttachment(data, label) {
                    return new links.Dropdown({
                        label: label || data.filename,
                        classes: 'attachment-link',
                        ref: 'io.ox/core/tk/attachment/links'
                    }).draw.call($node, { data: data, options: options });
                }

                function redraw(e, obj) {
                    var callback = function (attachments) {
                        if (attachments.length) {
                            _(attachments).each(function (a) {
                                drawAttachment(a, a.filename);
                            });
                            if (attachments.length > 1) {
                                drawAttachment(attachments, gt('All attachments')).find('a').removeClass('attachment-link');
                            }
                        } else {
                            $node.append(gt('None'));
                        }
                    };

                    if (obj && (obj.module !== options.module || obj.id !== baton.data.id || obj.folder !== (baton.data.folder || baton.data.folder_id))) {
                        return;
                    }

                    if (options.module === 'chronos') {
                        callback(baton.model.get('attachments'));
                        return;
                    }
                    $node.empty();
                    attachmentAPI.getAll({
                        module: options.module,
                        id: baton.data.id,
                        folder: baton.data.folder || baton.data.folder_id
                    }).done(callback);
                }

                attachmentAPI.on('attach detach', redraw);
                $node.on('dispose', function () {
                    attachmentAPI.off('attach detach', redraw);
                });

                redraw();
            }

        }, options);
    }

    var fileUploadWidget = function (options) {

        options = _.extend({
            buttontext: gt('Add attachments'),
            drive: false,
            multi: true
        }, options);

        var input, node = $('<div>').toggleClass('form-group', !!options.wrapperClass),
            id = _.uniqueId('form-control-label-'),
            uploadButton = $('<button type="button" class="btn btn-default btn-file">').attr('id', id).text(options.buttontext).append(
                input = $('<input name="file" type="file" class="file-input" tabindex="-1">').attr('aria-labelledby', id).prop({ multiple: options.multi })
            ),
            driveButton = $('<button type="button" class="btn btn-default" data-action="add-internal">').text(gt('Add from Drive'));

        input.on('focus', function () {
            uploadButton.addClass('active');
        }).on('blur', function () {
            uploadButton.removeClass('active');
        });

        if (options.drive && _.device('!smartphone') && capabilities.has('infostore')) {
            node.append(
                $('<div class="btn-group">').append(uploadButton, driveButton)
            );
        } else {
            node.append(uploadButton);
        }

        uploadButton.on('click keypress', function (e) {
            if (!$(e.target).is('button')) return;
            // Note: BUG #55335 - Filepicker fails to open in Firefox
            if (e.type === 'click' || /^(13|32)$/.test(e.which)) {
                e.preventDefault();
                input.focus(); // BUG #34034: FF needs to focus the input-element first
                input.trigger('click');
                uploadButton.focus(); // Reset focus to button
            }
        });

        return node;
    };

    var progressView  = DisposableView.extend({
        className: 'attachments-progress-view',
        //#. headline for a progress bar
        label: gt('Uploading attachments'),
        initialize: function (options) {
            var self = this;
            // cid needed (create with _.ecid)
            this.objectCid = options.cid;
            attachmentAPI.on('progress:' + this.objectCid, this.updateProgress.bind(self));

            options = options || {};
            this.label = options.label || this.label;
            this.callback = options.callback || $.noop;
        },
        render: function () {
            this.$el.append($('<label>').text(this.label),
                $('<div class="progress">').append(this.progress = $('<div class="progress-bar">'))
            );
            // for chaining
            return this;
        },
        updateProgress: function (e, progressEvent) {

            if (!progressEvent.total || !this.progress) {
                return;
            }
            var width = Math.max(0, Math.min(100, Math.round(progressEvent.loaded / progressEvent.total * 100)));

            this.progress.css('width', width + '%');
            if (width === 100) {
                this.callback();
            }
        },
        dispose: function () {
            attachmentAPI.off('progress: + this.objectCid');
        }
    });

    return {
        EditableAttachmentList: EditableAttachmentList,
        AttachmentList: AttachmentListOld,
        fileUploadWidget: fileUploadWidget,
        progressView: progressView
    };
});
