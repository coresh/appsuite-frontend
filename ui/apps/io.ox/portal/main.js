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
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define.async('io.ox/portal/main',
    ['io.ox/core/extensions',
     'io.ox/core/config',
     'io.ox/core/api/user',
     'io.ox/core/date',
     'gettext!io.ox/portal/portal',
     'apps/io.ox/portal/jquery.masonry.min.js',
     'less!io.ox/portal/style.css'],
function (ext, config, userAPI, date, gt) {

    'use strict';

    // wait for plugin dependencies
    var plugins = ext.getPlugins({ prefix: 'plugins/portal/', name: 'portal' });
    return require(plugins).pipe(function () {
        
        // application object
        var app = ox.ui.createApp({ name: 'io.ox/portal' }),
            // app window
            win,
            leftSide = $('<div class="io-ox-portal-left">'),
            rightSide = $('<div class="io-ox-portal-right">'),
            // update window title
            updateTitle = function () {
                win.setTitle(
                    $($.txt(getGreetingPhrase()))
                    .add($.txt(', '))
                    .add(userAPI.getTextNode(config.get('identifier')))
                    .add($.txt(' '))
                    .add($('<small>').addClass('subtitle').text('(' + ox.user + ')'))
                );
            };

        // time-based greeting phrase
        function getGreetingPhrase() {
            var hour = new date.Local().getHours();

            // find proper phrase
            if (hour >= 4 && hour <= 11) {
                return gt('Good morning');
            } else if (hour >= 18 && hour <= 23) {
                return gt('Good evening');
            } else {
                return gt('Hello');
            }
        }
        
        function makeClickHandler(extension) {
            return function (event) {
                rightSide.empty(); // TODO: Maybe keep these around and only send a refresh event or call
                var $node = $("<div/>").appendTo(rightSide).busy();

                return extension.invoke('load')
                    .pipe(function (data) {
                        return (extension.invoke('draw', $node, data) || $.Deferred())
                            .done(function () {
                                $node.idle();
                                extension.invoke('post', $node, extension);
                            });
                    })
                    .fail(function (e) {
                        $node.idle().remove();
                    });
            };
        }
        
        // launcher
        app.setLauncher(function () {

            // get window
            app.setWindow(win = ox.ui.createWindow({
                toolbar: true,
                titleWidth: '100%'
            }));

            updateTitle();
            _.every(1, 'hour', updateTitle);

            win.nodes.main
                .addClass('io-ox-portal')
                .append(leftSide, rightSide);

            // demo AD widget
            ext.point('io.ox/portal/widget').extend({
                index: 200,
                id: 'ad',
                tileHeight: 2,
                loadTile: function () {
                    return $.when();
                },
                drawTile: function (data) {
                    this.append(
                        $('<img>')
                        .attr({ src: ox.base + '/apps/themes/default/ad2.jpg', alt: 'ad' })
                        .css({ width: '100%', height: 'auto' })
                    );
                    return $.when();
                }
            });

            //TODO: Add Configurability
            ext.point('io.ox/portal/widget')
                .each(function (extension) {
                    var $node = $('<div>')
                        .addClass('io-ox-portal-widget-tile')
                        .attr('widget-id', extension.id)
                        .busy()
                        .appendTo(leftSide),
                        tileWidth,
                        tileHeight;
                    
                    tileWidth = (extension.metadata("tileWidth") || 1);
                    tileHeight = (extension.metadata("tileHeight") || 1);
                    
                    $node.css({
                        width: (tileWidth * 180 + (tileWidth - 1) * 10) + "px",
                        height: (tileHeight * 180 + (tileHeight - 1) * 10) + "px",
                        margin: "5px"
                    });
                        
                    $node.on('click', makeClickHandler(extension));
                    
                    if (!extension.loadTile) {
                        extension.loadTile = function () {
                            return $.Deferred().resolve();
                        };
                    }
                    
                    if (!extension.drawTile) {
                        extension.drawTile = function () {
                            this.append($("<div>").text(extension.id));
                            return $.Deferred().resolve();
                        };
                    }
                    
                    return extension.invoke('loadTile')
                        .pipe(function (data) {
                            return (extension.invoke('drawTile', $node, data) || $.Deferred())
                                .done(function () {
                                    $node.idle();
                                    extension.invoke('postTile', $node, extension);
                                });
                        })
                        .fail(function (e) {
                            $node.idle().remove();
                        });
                });


            // go!
            win.show(function () {
                leftSide.masonry({
                    itemSelector: '.io-ox-portal-widget-tile',
                    columnWidth: 190
                });
            });
        });

        return {
            getApp: app.getInstance
        };
    });
});