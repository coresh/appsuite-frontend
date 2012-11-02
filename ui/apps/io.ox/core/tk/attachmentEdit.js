/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2011
 * Mail: info@open-xchange.com
 *
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 */

define('io.ox/core/tk/attachmentEdit', ['io.ox/core/api/attachment', 'io.ox/core/strings', 'less!io.ox/core/tk/attachmentEdit.less'], function (attachmentAPI, strings) {
	'use strict';
	var counter = 0;

	function AttachmentList(options) {
		_.extend(this, {

			init: function () {
				var self = this;
				this.attachmentsToAdd = [];
				this.attachmentsToDelete = [];
				this.attachmentsOnServer = [];

				this.allAttachments = [];

				this.loadAttachments();

				function uploadOnSave(response) {
					self.model.off('create update', uploadOnSave);
					self.save(response.id, response.folder || response.folder_id);
				}

				this.model.on('create update', uploadOnSave);
			},

			render: function () {
				var self = this;
				_(this.allAttachments).each(function (attachment) {
					self.$el.append(self.renderAttachment(attachment));
				});
				return this;
			},
			renderAttachment: function (attachment) {
				var self = this;
				var $el = $('<div class="io-ox-core-tk-attachment">');
				$el.append(
					$('<table width="100%">').append(
						$('<tr>').append(
							$('<td class="attachment-icon">').append($('<img src="' + ox.base + '/apps/themes/default/attachment.png">')),
							$('<td class="details">').append(
								$('<table>').append(
									$('<tr>').append(
										$('<td class="filename">').text(attachment.filename)
									),
									$('<tr>').append(
										$('<td class="filesize muted">').text(strings.fileSize(attachment.file_size))
									)
								)
							),
							$('<td class="delete">').text('x').on('click', function () {
								self.deleteAttachment(attachment);
							})
						)
					)
				);
				return $el;
			},
			loadAttachments: function () {
				var self = this;
				if (this.model.id) {
					attachmentAPI.getAll({module: options.module, id: this.model.id, folder: this.model.get('folder') || this.model.get('folder_id')}).done(function (attachments) {
						self.attachmentsOnServer = attachments;
						self.updateState();
					});
				}
			},

			updateState: function () {
				var self = this;
				this.allAttachments = _(this.attachmentsOnServer.concat(this.attachmentsToAdd)).reject(function (attachment) {
					return _(self.attachmentsToDelete).any(function (toDelete) {
						return toDelete.id === attachment.id;
					});
				});
				this.attachmentsChanged();
			},

			attachmentsChanged: function () {
				this.$el.empty();
				this.render();
			},
			addFile: function (file) {
				this.addAttachment({file: file, newAttachment: true, cid: counter++, filename: file.name, file_size: file.size});
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
				var self = this;
				var apiOptions = {
					module: this.module,
					id: id || this.model.id,
					folder: folderId || this.model.get('folder') || this.model.get('folder_id')
				};
				if (this.attachmentsToDelete.length) {
					attachmentAPI.remove(apiOptions, _(this.attachmentsToDelete).pluck('id')).fail(function (resp) {
						self.model.trigger('backendError', resp);
					});
				}

				if (this.attachmentsToAdd.length) {
					attachmentAPI.create(apiOptions, _(this.attachmentsToAdd).pluck('file')).fail(function (resp) {
						self.model.trigger('backendError', resp);
					});
				}

				this.attachmentsToAdd = [];
				this.attachmentsToDelete = [];
				this.attachmentsOnServer = [];

				this.allAttachments = [];
			}

		}, options);
	}

	return {
		AttachmentList: AttachmentList
	};
});
