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
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/files/icons/perspective',
    ['io.ox/files/list/view-detail',
     'io.ox/core/extensions',
     'io.ox/core/tk/dialogs',
     'io.ox/files/api',
     'io.ox/core/tk/upload',
     'io.ox/core/extPatterns/dnd',
     'io.ox/core/extPatterns/shortcuts',
     'io.ox/core/extPatterns/actions',
     'io.ox/core/api/folder',
     'gettext!io.ox/files',
     'io.ox/core/capabilities',
     'io.ox/core/tk/selection',
     'io.ox/core/notifications',
     'apps/io.ox/core/tk/jquery.imageloader.js'
    ], function (viewDetail, ext, dialogs, api, upload, dnd, shortcuts, actions, folderAPI, gt, Caps, Selection, notifications) {

    'use strict';

    var dropZone,
    loadFilesDef = $.Deferred();

    ext.point('io.ox/files/icons/options').extend({
        thumbnailWidth: 128,
        thumbnailHeight: 90,
        fileIconWidth: 158,
        fileIconHeight: 182
    });

    ext.point('io.ox/files/icons').extend({
        id: 'breadcrumb',
        index: 100,
        draw: function (baton) {
            if (!baton.app.getWindow().search.active) {
                this.append(
                    baton.$.breadcrumb = folderAPI.getBreadcrumb(baton.app.folder.get(), { handler: baton.app.folder.set })
                );
            }
        }
    });

    ext.point('io.ox/files/icons').extend({
        id: 'search-term',
        index: 100,
        draw: function (baton) {
            if (baton.app.getWindow().search.active) {
                this.append(
                    $('<li class="breadcrumb">').append(
                        $('<li class="active">').text(
                            //#. Appears in file icon view during searches
                            gt('Searched for: %1$s', baton.app.getWindow().search.query)
                        )
                    )
                );
            }
        }
    });

    ext.point('io.ox/files/icons').extend({
        id: 'icons',
        index: 200,
        draw: function (baton) {
            this.append(
                baton.$.iconContainer = $('<div class="file-icon-container">')
            );
        }
    });

    function drawGenericIcon(name) {
        var node = $('<i>');
        if (/docx?$/i.test(name)) { node.addClass('icon-align-left file-type-doc'); }
        else if (/xlsx?$/i.test(name)) { node.addClass('icon-table file-type-xls'); }
        else if (/pptx?$/i.test(name)) { node.addClass('icon-picture file-type-ppt'); }
        else if ((/(aac|mp3|m4a|m4b|ogg|opus|wav)$/i).test(name)) { node.addClass('icon-music'); }
        else if ((/(mp4|ogv|webm)$/i).test(name)) { node.addClass('icon-film'); }
        else { node.addClass('icon-file'); }
        return node;
    }

    function iconError() {
        $(this).remove();
    }

    function cut(str, maxLen, cutPos) {
        return _.ellipsis(str, {
                max: maxLen || 70,
                length: cutPos || 15,
                charpos: 'middle'
            });
    }

    function dropZoneInit(app) {
        if (_.browser.IE === undefined || _.browser.IE > 9) {
            dropZoneOff();
            dropZone = new dnd.UploadZone({
                ref: 'io.ox/files/dnd/actions'
            }, app);
            dropZoneOn();
        }
    }

    function dropZoneOn() {
        if (dropZone) dropZone.include();
    }

    function dropZoneOff() {
        if (dropZone) dropZone.remove();
    }

    function previewMode(file) {
        if ((/^(image\/(gif|png|jpe?g|bmp|tiff))$/i).test(file.file_mimetype)) {
            return 'thumbnail';
        } else if ((/^audio\/(mpeg|m4a|m4b|mp3|ogg|oga|opus|x-m4a)$/i).test(file.file_mimetype)) {
            return 'cover';
        } else if (Caps.has('document_preview') &&
                (/^application\/.*(ms-word|ms-excel|ms-powerpoint|msword|msexcel|mspowerpoint|openxmlformats|opendocument|pdf|rtf).*$/i).test(file.file_mimetype) ||
                (/^text\/.*(rtf|plain).*$/i).test(file.file_mimetype)) {
            return 'preview';
        }
        return false;
    }

    function cid_find(str) {
        return str.replace(/\\\./g, '\\\\.');
    }

    ext.point('io.ox/files/icons/file').extend({
        draw: function (baton) {
            var file = baton.data,
                img,
                mode = previewMode(file),
                genericIcon = drawGenericIcon(file.filename),
                wrap = $('<div class="wrap">').append(genericIcon),
                options = _.extend({ version: true }, baton.options);

            if (mode) {
                img = $('<img>', {
                    alt: '',
                    'data-src': api.getUrl(file, mode, options)
                })
                .addClass('img-polaroid lazy')
                .one({
                    load: function () {
                        genericIcon.remove();
                    },
                    error: iconError
                });
            }
            this.addClass('file-icon pull-left selectable')
                .attr('data-obj-id', _.cid(file))
                .attr('tabindex', 1)
                .append(
                    (img ? wrap.append(img) : wrap),
                    $('<div class="title drag-title">').text(gt.noI18n(cut(file.filename || file.title, 55))).prepend(
                            (file.locked_until ? $('<i class="icon-lock">') : '')
                        ),
                    $('<input type="checkbox" class="reflect-selection" style="display:none">')
                );
        }
    });

    function loadFiles(app) {
        var def = $.Deferred();
        if (!app.getWindow().search.active) {
            api.getAll({ folder: app.folder.get() }, false).done(def.resolve).fail(def.reject);
        } else {
            api.search(app.getWindow().search.query).done(def.resolve).fail(def.reject);
        }
        return def;
    }

    function calculateLayout(el, options) {

        var rows = Math.round((el.height() - 40) / options.fileIconHeight),
            cols = Math.floor((el.width() - 6) / options.fileIconWidth);

        if (rows === 0) rows = 1;
        if (cols === 0) cols = 1;

        return { iconRows: rows, iconCols: cols, icons: rows * cols };
    }

    return _.extend(new ox.ui.Perspective('icons'), {

        render: function (app) {
            var options = ext.point('io.ox/files/icons/options').options(),
                win = app.getWindow(),
                self = this,
                scrollpane,
                iconview = $('<div class="files-scrollable-pane f6-target" tabindex="1" role="section">'),
                iconContainer,
                start,
                end,
                drawIcon,
                drawIcons,
                redraw,
                drawFirst,
                allIds = [],
                drawnCids = [],
                displayedRows,
                layout,
                recalculateLayout,
                baton = new ext.Baton({ app: app }),
                dialog = new dialogs.SidePopup(),
                inline;

            this.main.addClass('files-icon-perspective').empty().append(
                scrollpane = $('<div class="files-iconview">').append(iconview)
            );

            Selection.extend(this, iconview, { draggable: true, dragType: 'mail' });

            layout = calculateLayout(iconview.parent(), options);

            dropZoneInit(app);

            app.on('perspective:icons:hide', dropZoneOff)
               .on('perspective:icons:show', dropZoneOn)
               .on('folder:change', function () {
                    app.currentFile = null;
                    dropZoneInit(app);
                    app.getWindow().search.clear();
                    app.getWindow().search.active = false;
                    self.main.closest('.search-open').removeClass('search-open');
                    dialog.close();
                    allIds = [];
                    self.selection.clear();
                    drawFirst();
                });

            iconview.on('keydown', '.selectable', function (e) {
                switch (e.keyCode || e.which) {
                case 13: // enter
                    $(this).trigger('click');
                    break;
                case 37: // left
                    $(this).prev().focus();
                    break;
                case 39: // right
                    $(this).next().focus();
                    break;
                }
            }).on('click', '.selectable', function (e) {
                var self = this, el, cid = _.cid($(this).attr('data-obj-id'));
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    api.get(cid).done(function (file) {
                        app.currentFile = file;
                        if (dropZone) {
                            dropZone.update();
                        }
                        dialog.show(e, function (popup) {
                            popup.append(viewDetail.draw(file, app));
                            el = popup.closest('.io-ox-sidepopup');
                        });
                        dialog.on('close', function () {
                            if (window.mejs) {
                                _(window.mejs.players).each(function (player) {
                                    if ($(player.node).parents('.preview').length > 0) {
                                        player.pause();
                                    }
                                });
                            }
                            if (dropZone) {
                                var tmp = app.currentFile;
                                app.currentFile = null;
                                dropZone.update();
                                dropZoneInit(app);
                                app.currentFile = tmp;
                            }
                            $(self).focus(); // Refocus on clicked element
                        });
                        _.defer(function () { el.focus(); }); // Focus SidePopup
                    });
                } else {
                    dialog.close();
                }
            });

            drawIcon = function (file) {
                var node = $('<a>');
                ext.point('io.ox/files/icons/file').invoke(
                    'draw', node, new ext.Baton({ data: file, options: options })
                );
                return node;
            };

            drawIcons = function (files) {
                iconContainer.find('.scroll-spacer').before(
                    _(files).map(function (file) {
                        drawnCids.push(_.cid(file));
                        return drawIcon(file);
                    })
                );
            };

            redraw = function (ids) {
                drawIcons(ids);
                scrollpane.on('scroll', function () {
                    /*
                     *  How this works:
                     *
                     *      +--------+     0
                     *      |        |
                     *      |        |
                     *      |        |
                     *      |        |
                     *   +--+--------+--+  scrollTop
                     *   |  |        |  |
                     *   |  |        |  |
                     *   |  |        |  |  height
                     *   |  |        |  |
                     *   |  |        |  |
                     *   +--+--------+--+  bottom
                     *      |        |
                     *      |        |
                     *      +--------+     scrollHeight
                     *
                     *  If bottom and scrollHeight are near (~ 50 pixels) load new icons.
                     *
                     */
                    var scrollTop = scrollpane.scrollTop(),
                        scrollHeight = scrollpane.prop('scrollHeight'),
                        height = scrollpane.outerHeight(),
                        bottom = scrollTop + height;
                    // scrolled to bottom?
                    if (bottom > (scrollHeight - 50)) {
                        scrollpane.off('scroll');
                        start = end;
                        end = end + layout.iconCols;
                        if (layout.iconCols <= 3) end = end + 10;
                        displayedRows = displayedRows + 1;
                        redraw(allIds.slice(start, end));
                    }
                });
                $('img.img-polaroid').imageloader({
                    callback: function (elm) {
                        $(elm).fadeIn();
                    },
                    timeout: 60000
                });

                self.selection.update();
            };

            drawFirst = function () {
                iconview.empty().busy();

                loadFilesDef.reject();

                loadFilesDef = loadFiles(app);

                loadFilesDef.then(
                    function success(ids) {

                        iconview.empty().idle();
                        baton.allIds = allIds = ids;
                        ext.point('io.ox/files/icons').invoke('draw', iconview, baton);
                        iconContainer = baton.$.iconContainer;

                         // add inline link
                        if ($('.inline-actions', iconview).length === 0) {
                            iconview.find('.breadcrumb').after(
                                inline = $('<div class="inline-actions">')
                            );
                        }

                        // add element to provoke scrolling
                        iconContainer.append(
                            $('<div class="scroll-spacer">').css({ height: '20px', clear: 'both' })
                        );

                        displayedRows = layout.iconRows;
                        start = 0;
                        end = displayedRows * layout.iconCols;
                        if (layout.iconCols <= 3) end = end + 10;

                        self.selection.clear();
                        self.selection.resetLastIndex();
                        self.selection.init(allIds);
                        redraw(allIds.slice(start, end));
                        ext.point('io.ox/files/icons/actions').invoke('draw', inline.empty(), baton);
                    },
                    function fail(response) {
                        if (response) {
                            iconview.idle();
                            iconContainer.prepend(
                                $('<div class="alert alert-info">').text(response.error)
                            );
                        }
                    }
                );
            };

            recalculateLayout = function () {
                // This should be improved
                var last_layout = layout;
                layout = calculateLayout($('.files-iconview'), options);

                if (last_layout.icons < layout.icons) {
                    start = end;
                    end = end + (layout.icons - last_layout.icons);
                    redraw(allIds.slice(start, end));
                }
                displayedRows = layout.iconRows + 1;
                start = end;
                end = end + layout.iconCols;
                redraw(allIds.slice(start, end));
            };

            app.queues = {};

            app.queues.create = upload.createQueue({
                start: function () {
                    win.busy(0);
                },
                progress: function (file, position, files) {
                    var pct = position / files.length;
                    win.busy(pct, 0);
                    return api.uploadFile({ file: file, folder: app.folder.get() })
                    .progress(function (e) {
                        var sub = e.loaded / e.total;
                        win.busy(pct + sub / files.length, sub);
                    })
                    .fail(function (e) {
                        if (e && e.data && e.data.custom) {
                            notifications.yell(e.data.custom.type, e.data.custom.text);
                        }
                    });
                },
                stop: function () {
                    api.trigger('refresh.all');
                    win.idle();
                }
            });

            app.queues.update = upload.createQueue({
                start: function () {
                    win.busy(0);
                },
                progress: function (file, position, files) {
                    var pct = position / files.length;
                    win.busy(pct, 0);
                    return api.uploadNewVersion({
                            file: file,
                            id: app.currentFile.id,
                            folder: app.currentFile.folder_id,
                            timestamp: _.now()
                        })
                        .progress(function (e) {
                            var sub = e.loaded / e.total;
                            win.busy(pct + sub / files.length, sub);
                        }).fail(function (e) {
                            if (e && e.data && e.data.custom) {
                                notifications.yell(e.data.custom.type, e.data.custom.text);
                            }
                        });
                },
                stop: function () {
                    win.idle();
                }
            });

            var shortcutPoint = new shortcuts.Shortcuts({
                ref: 'io.ox/files/shortcuts'
            });

            $(window).resize(_.debounce(recalculateLayout, 300));

            win.on('search cancel-search', function () {
                allIds = [];
                drawFirst();
            });

            win.on('hide', function () {
                shortcutPoint.deactivate();
            });

            api.on('update', function (e, obj) {
                // update icon
                var cid = _.cid(obj),
                    icon = iconview.find('.file-icon[data-obj-id="' + cid_find(cid) + '"]');
                if (icon.length) {
                    icon.replaceWith(drawIcon(obj));
                }
            });

            api.on('refresh.all', function () {
                if (!app.getWindow().search.active) {
                    api.getAll({ folder: app.folder.get() }, false).done(function (ids) {

                        var hash = {},
                            oldhash  = {},
                            oldIds   = [],
                            newIds   = [],
                            changed  = [],
                            deleted  = [],
                            added    = [],
                            indexPrev,
                            indexPrevPosition,
                            indexNextPosition;

                        indexPrev = function (index, cid) {
                            return _.indexOf(drawnCids, _.indexOf(index, cid) - 1);
                        };

                        indexPrevPosition = function (arr, key) {
                            return arr[(_.indexOf(arr, key) - 1 + arr.length) % arr.length];
                        };

                        indexNextPosition = function (arr, key) {
                            return arr[(_.indexOf(arr, key) + 1 + arr.length) % arr.length];
                        };

                        _(allIds).each(function (obj) {
                            oldhash[_.cid(obj)] = obj;
                        });

                        _(ids).each(function (obj) {
                            var cid = _.cid(obj);
                            hash[cid] = obj;

                            // Update if cid still exists, has already been drawn and object was modified.
                            // Note: If title is changed, last_modified date is not updated
                            if (_.isObject(oldhash[cid]) && (_.indexOf(drawnCids, cid) !== -1) &&
                               (obj.last_modified !== oldhash[cid].last_modified || obj.title !== oldhash[cid].title)) {
                                changed.push(cid);
                            }
                        });

                        oldIds = _.map(allIds, _.cid);
                        newIds = _.map(ids, _.cid);

                        for (var id in oldIds) {
                            if (-1 === newIds.indexOf(oldIds[id])) {
                                deleted.push(oldIds[id]);
                            }
                        }

                        for (var id in newIds) {
                            if (-1 === oldIds.indexOf(newIds[id])) {
                                added.push(newIds[id]);
                            }
                        }

                        baton.allIds = allIds = ids;

                        ext.point('io.ox/files/icons/actions').invoke('draw', inline.empty(), baton);

                        _(changed).each(function (cid) {

                            var data = hash[cid],
                                prev = indexPrevPosition(newIds, cid);

                            iconview.find('.file-icon[data-obj-id="' + cid_find(cid) + '"]').remove();

                            if (indexPrev(newIds, cid)) {
                                if (iconview.find('.file-icon[data-obj-id="' + cid_find(prev) + '"]').length) {
                                    iconview.find('.file-icon[data-obj-id="' + cid_find(prev) + '"]').after(drawIcon(data));
                                } else {
                                    iconview.find('.file-icon-container').prepend(drawIcon(data));
                                }
                            } else {
                                end = end - 1;
                            }

                        });

                        _(deleted).each(function (cid) {

                            iconview.find('.file-icon[data-obj-id="' + cid_find(cid) + '"]').remove();
                            end = end - 1;

                        });

                        _(added).each(function (cid) {

                            var data = hash[cid],
                                prev = indexPrevPosition(newIds, cid);

                            if (indexPrev(newIds, cid)) {
                                if (iconview.find('.file-icon[data-obj-id="' + cid_find(prev) + '"]').length) {
                                    iconview.find('.file-icon[data-obj-id="' + cid_find(prev) + '"]').after(drawIcon(data));
                                } else {
                                    iconview.find('.file-icon-container').prepend(drawIcon(data));
                                }
                                end = end + 1;
                            }
                        });
                        self.selection.clear();
                        self.selection.resetLastIndex();
                        self.selection.init(allIds);
                        recalculateLayout();
                        hash = oldhash = oldIds = newIds = changed = deleted = added = indexPrev = indexPrevPosition = indexNextPosition = null;
                    });
                }
            });
            drawFirst();
        }
    });
});
