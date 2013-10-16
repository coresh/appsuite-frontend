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

define('io.ox/lessons/main',
    ['io.ox/core/extensions',
     'io.ox/lessons/actions',
     'io.ox/lessons/lessonlist'
    ], function (ext) {

    'use strict';

    var app = ox.ui.createApp({ name: 'io.ox/lessons', title: 'Lessons' }),
        // app window
        win,
        openLesson = function (lesson) {
            return function () {
                lesson.start({
                    app: app,
                    win: win
                });
                app.lesson = lesson;
                app.setState({lesson: lesson.id});
            };
        };
    // launcher
    app.setLauncher(function () {
        // get window
        win = ox.ui.createWindow({
            name: 'io.ox/lessons',
            title: 'Lessons',
            toolbar: true
        });

        win.nodes.main.css({
            overflow: 'auto'
        });

        app.setWindow(win);

        win.show(function () {
            var state = app.getState();
            if (state && state.lesson) {

                ext.point('io.ox/lessons/lesson').get(state.lesson, function (lesson) {
                    lesson.start({
                        app: app,
                        win: win
                    });
                    app.lesson = lesson;
                });
            }
            if (!app.lesson) {
                app.tableOfContents();
            }
        });
    });

    app.tableOfContents = function () {
        app.setState({lesson: null});
        win.nodes.main.empty();
        var lessons = {};
        ext.point('io.ox/lessons/lesson').each(function (lesson) {
            var section = lessons[lesson.section] || (lessons[lesson.section] = []);
            section.push(lesson);
        });
        var $all = $('<div>').appendTo(win.nodes.main);
        $all.css({
            margin: '20px'
        });
        win.nodes.main.css({overflow: 'auto'});

        _(lessons).each(function (lessons, sectionName) {
            $all.append($('<h2>').text(sectionName));
            $('<div>').appendTo(win.nodes.main);
            _(lessons).each(function (lesson) {
                var $lessonDiv = $('<div>').appendTo($all);
                $lessonDiv.append($('<h3>').append($('<a href="#">').text(lesson.title)).on('click', openLesson(lesson)));
                $lessonDiv.append($('<div>').text(lesson.description));
                $lessonDiv.on('click', openLesson(lesson));
                $lessonDiv.css({
                    margin: '20px'
                });
            });
        });

    };

    return {
        getApp: app.getInstance
    };
});
