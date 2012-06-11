/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2012
 * Mail: info@open-xchange.com
 *
 * @author Daniel Rentz <daniel.rentz@open-xchange.com>
 */

define('io.ox/office/main',
    ['io.ox/files/api',
     'io.ox/office/editor',
     'gettext!io.ox/office/main',
     'less!io.ox/office/style.css'
    ], function (api, Editor, gt) {

    'use strict';

    // multi-instance pattern: on each call, create a new application
    // TODO: return open application per file
    function createInstance() {

        var // application object
            app = ox.ui.createApp({ name: 'io.ox/office', title: gt('OXOffice') }),
            // options passed to 'load'
            appOptions = {},
            // application window
            win = null,
            // default window title
            winTitle = gt('OX Office'),
            // text editor engine
            editor = new Editor();

        // launcher
        app.setLauncher(function () {

            // create the application window
            app.setWindow(win = ox.ui.createWindow({
                name: 'io.ox/office',
                title: winTitle,
                close: true,
                search: false
            }));

            // initialize global editor structure
            win.nodes.main.addClass('io-ox-office-editor');
        });

        // load document into editor
        app.load = function (options) {
            appOptions = options || {};

            // dump options
            _(appOptions).each(function (value, id) {
                win.nodes.main.append($('<p>').text(id + ' = ' + value));
            });

            // add filename to title
            if (appOptions.filename) {
                win.setTitle(winTitle + ' - ' + appOptions.filename);
            }

            var def = $.Deferred();
            win.show(function () {
                // load file
                win.busy();
                $.when(
                    $.ajax({type: 'GET', url: ox.apiRoot + "/oxodocumentfilter?id=" + appOptions.id, dataType: 'json'}))
                .done(function (data, text) {
/*
 * init editor with data returned from document to operations filter (oxodocumentfilter)
 */
                    win.idle();
                    def.resolve();
                })
                .fail(function () {
                    win.idle();
                    def.reject();
                });
            });
            return def;
        };

        app.destroy = function () {
            app = win = null;
        };

        // the function passed to setQuit will be called when the application
        // is about to be closed
        app.setQuit(function () {
            var def = $.Deferred();
            if (/*dirty?*/true) {
                require(['io.ox/core/tk/dialogs'], function (dialogs) {
                    new dialogs.ModalDialog({ easyOut: true })
                    .text(gt('The document has been modified. Do you want to save your changes?'))
                    .addPrimaryButton('save', gt('Save'))
                    .addAlternativeButton('discard', gt('Discard'))
                    .addButton('cancel', gt('Cancel'))
                    .on('save', function () {
                        alert('Saving...');
                        app.destroy();
                        def.resolve();
                    })
                    .on('discard', function () {
                        app.destroy();
                        def.resolve();
                    })
                    .on('cancel', def.reject)
                    .show();
                });
            } else {
                app.destroy();
                def.resolve();
            }
            return def;
        });

        return app;
    }

    return {
        getApp: createInstance
    };
});
