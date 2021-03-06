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
 * @author Frank Paczynski <frank.paczynski@open-xchange.com>
 */

define('io.ox/backbone/views/edit-picture', [
    'io.ox/core/extensions',
    'io.ox/backbone/views/modal',
    'io.ox/backbone/views/capture-media',
    'io.ox/core/media-devices',
    'settings!io.ox/core',
    'io.ox/contacts/api',
    'gettext!io.ox/contacts',
    'static/3rd.party/croppie.min.js',
    'css!3rd.party/croppie/croppie.css',
    'less!io.ox/backbone/views/edit-picture'
], function (ext, ModalDialog, caputure, mediaDevices, coreSettings, api, gt) {

    'use strict';

    return {

        getDialog: function (opt) {

            return new ModalDialog({
                title: opt.title || gt('Change photo'),
                point: 'io.ox/backbone/crop',
                width: 560,
                async: true,
                model: opt.model || new Backbone.Model(),
                focus: 'button[data-action="upload"]'
            })
            .inject({
                load: function () {
                    return $.when().then(function () {
                        var file = this.model.get('pictureFile'),
                            imageurl = this.model.get('image1_url');
                        // add unique identifier to prevent caching bugs
                        if (imageurl) imageurl = imageurl + '&' + $.param({ uniq: _.now() });
                        // a) dataUrl (webcam photo)
                        if (_.isString(file)) return file;
                        // b) server image (or blank)
                        if (!file || !file.lastModified) return imageurl;
                        // c) local file
                        return getContent(file);
                    }.bind(this))
                    .then(this.setImage.bind(this));
                },
                storeState: function (opt) {
                    var current = _.extend({}, this.model.get('crop'), this.$body.croppie('get'));
                    // degree value TO croppie's orientation ids
                    if (opt && opt.rotate) current.orientation = mapOrientation(current.orientation);
                    this.model.set('crop', current);
                },
                setImage: function (imageurl) {
                    this.toggleEmpty(!imageurl);
                    // restore latest state
                    var options = _.extend({ zoom: 0.0 }, this.model.get('crop'), { url: imageurl });
                    if (!imageurl) return;
                    this.$('.cr-boundary, .cr-slider-wrap').show();
                    return this.$body.croppie('bind', options);
                },
                toggleEmpty: function (empty) {
                    this.$el.toggleClass('empty', empty);
                    this.$body.find('button, :input').prop('disabled', empty);
                },
                onApply: function () {
                    var width = coreSettings.get('properties/contactImageMaxWidth', 500);
                    this.storeState();
                    this.$body
                        .croppie('result', { type: 'blob', size: { width: width }, format: 'jpeg', quality: 1.0, circle: false })
                        .then(function (blob) {
                            //store info
                            var scaled = new File([blob], 'cropped.jpeg', { type: 'image/jpeg' });
                            // trigger proper change events
                            this.model.unset('pictureFileEdited', { silent: true });
                            this.model.set('pictureFileEdited', scaled);
                            // dialog
                            this.idle();
                            this.close();
                        }.bind(this));
                },
                onRemovePhoto: function () {
                    this.idle();
                    this.toggleEmpty(true);
                    this.model.unset('pictureFile');
                },
                onCancel: function () {
                    this.model.unset('pictureFile');
                    this.idle();
                },
                onUserMedia: function () {
                    caputure.getDialog().open().on('ready', function (dataURL) {
                        this.model.set('pictureFile', dataURL);
                        this.setImage(dataURL);
                    }.bind(this));
                },
                onRotate: function (deg) {
                    this.$body.croppie('rotate', deg);
                    this.storeState({ rotate: true });
                }
            })
            .extend({
                'toolbar': function () {
                    this.$header.append(
                        $('<div class="upper-toolbar">').append(
                            $('<button type="button" class="btn btn-default" data-action="upload">').text(gt('Upload a photo')),
                            mediaDevices.isSupported() ?
                                $('<button type="button" class="btn btn-default" data-action="usermedia">').text(gt('Take a photo')) :
                                $()
                        )
                        .on('click', 'button', function (e) {
                            this.trigger('action', $(e.currentTarget).data('action'));
                        }.bind(this))
                    );
                },
                'default': function () {
                    this.$el.addClass('edit-picture');
                    // reserve some more space for the stacked buttons on small devices
                    // boundary is outer dark area, viewort is the visible part of the image.
                    var boundaryWidth, boundaryHeight, viewport;
                    if (_.device('small')) {
                        boundaryWidth = 320;
                        boundaryHeight = 240;
                        viewport = 180;
                    } else {
                        boundaryWidth = 560;
                        boundaryHeight = 360;
                        viewport = 320;
                    }
                    var options = {
                        viewport: { width: viewport, height: viewport, type: 'circle' },
                        boundary: { width: boundaryWidth, height: boundaryHeight },
                        showZoomer: true,
                        enableResize: false,
                        enableOrientation: true
                    };
                    this.$body.croppie(options);
                },
                'slider-label': function () {
                    var $body = this.$body;
                    // increase step size and add slider label
                    var id = _.uniqueId('slider-');
                    $body.on('update', update)
                        .find('input.cr-slider')
                        .attr({ 'id': id, 'step': '0.01' })
                        .before($('<label id="zoom" class="control-label sr-only">').attr('for', id));
                    // use percental values
                    function update() {
                        // update label
                        var $slider = $body.find('input.cr-slider'),
                            min = $slider.attr('min'),
                            max = $slider.attr('max'),
                            step = $slider.attr('step'),
                            current = $body.croppie('get').zoom,
                            zoom = ((current - min) * 100 / (max - min)),
                            //#. image zoom, %1$d is the zoomlevel of the previewpicture in percent
                            text = zoom ? gt.format('Zoom: %1$d%', zoom.toFixed(0)) :
                                //#. noun. label for the zoomslider in case the zoom is undefined or 0
                                gt('Zoom');
                        // remove 'blind spot' at range end (last step would exceed max)
                        $slider.attr('max', max = max - ((max - min) % step));
                        // maps absolute numbers to percental values
                        $body.find('#zoom').text(text);
                    }
                },
                'croppie-focus': function () {
                    this.$body.find('.cr-boundary').on('mousedown click', function () {
                        $(this).find('.cr-viewport.cr-vp-circle').focus();
                    });
                },
                'inline-actions': function () {
                    this.$body.append(
                        $('<div class="inline-actions">').append(
                            // ROTATE LEFT
                            $('<button type="button" class="btn" data-action="rotate-left">').append(
                                $('<i class="fa fa-rotate-left fa-lg">'),
                                $.txt('Rotate left')
                            ),
                            // ROTATE RIGHT
                            $('<button type="button" class="btn" data-action="rotate-right">').append(
                                $('<i class="fa fa-rotate-right fa-lg">'),
                                $.txt('Rotate right')
                            )
                        )
                        .on('click', 'button', function (e) {
                            this.trigger('action', $(e.currentTarget).data('action'));
                        }.bind(this))
                    );
                }
            })
            .addAlternativeButton({ label: gt('Remove photo'), action: 'remove' })
            .addCancelButton()
            .addButton({ label: gt('Apply'), action: 'apply' })
            .on('open', function () {
                this.busy();
                this.load().done(this.idle);
            })
            .on('action', function (action) {
                switch (action) {
                    case 'usermedia':
                        this.onUserMedia();
                        break;
                    case 'rotate-left':
                        this.onRotate(90);
                        break;
                    case 'rotate-right':
                        this.onRotate(-90);
                        break;
                    case 'upload':
                        this.trigger('upload');
                        break;
                    case 'remove':
                        this.onRemovePhoto();
                        break;
                    case 'cancel':
                        this.onCancel();
                        break;
                    case 'apply':
                        if (!this.$el.hasClass('empty')) return this.onApply();
                        // use existing image was removed so update model
                        if (this.model.get('image1_url')) this.trigger('reset');
                        // simply cancel when no photo was provided
                        this.onCancel();
                        this.close();
                        break;
                    // no default
                }
            });
        }
    };

    function getContent(file) {
        var def = $.Deferred(),
            reader = new FileReader();
        reader.onload = function (e) { def.resolve(e.target.result); };
        reader.onerror = function (e) { def.reject(undefined, e); };
        reader.readAsDataURL(file);
        return def;
    }

    function mapOrientation(num) {
        // 1 = 0°, 6: 90°, 3: 180°, 8: 270°
        var ids = [1, 6, 3, 8],
            index = Math.max(ids.indexOf(num), 0) + 1;
        return ids[index % 4];
    }
});
