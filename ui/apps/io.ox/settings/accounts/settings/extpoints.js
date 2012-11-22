/* REMOVE THIS AS SOON AS POSSIBLE:
 * This is a holder for all portal-related settings. These are supposed to be in each portal
 * plugin, where they belong, but it is not possible to put them there yet, because we cannot
 * ensure they are loaded at the proper time. Currently, Cisco and Vic are working on this.
 */
define('io.ox/settings/accounts/settings/extpoints', ['io.ox/core/extensions'], function (ext) {
    'use strict';

    /* * * * * * * *
     * REDDIT
     */
    ext.point('io.ox/portal/settings/detail/tile').extend({
        index: 100,
        id: 'portal-settings-reddit',
        draw: function (data) {
            var that = this;
            require(['settings!plugins/portal/reddit', 'gettext!io.ox/portal', 'io.ox/core/tk/dialogs'], function (settings, gt, dialogs) {
                var subreddits = settings.get('subreddits'),
                staticStrings = {
                    SUBREDDITS: gt('Subreddits'),
                    ADD:        gt('Add'),
                    EDIT:       gt('Edit'),
                    DELETE:     gt('Delete')
                },

                SubredditSelectView = Backbone.View.extend({
                    _modelBinder: undefined,
                    initialize: function (options) {
                        this._modelBinder = new Backbone.ModelBinder();
                    },
                    render: function () {
                        var self = this;

                        self.$el.empty().append(
                            $('<div class="sortable-item listbox-item enabled">')
                            .attr({'data-subreddit': this.model.get('subreddit'), 'data-mode': this.model.get('mode')}).append(
                                $('<span data-property="subreddit">'),
                                $('<span class="right" data-property="mode">')
                            )
                        );

                        // Used by jquery ui sortable
                        self.$el.attr('id', this.model.get('mode') + '#' + this.model.get('subreddit'));

                        var defaultBindings = Backbone.ModelBinder.createDefaultBindings(self.el, 'data-property');
                        self._modelBinder.bind(self.model, self.el, defaultBindings);

                        return self;
                    },
                    events: {
                        'click .sortable-item': 'onSelect'
                    },
                    onSelect: function () {
                        this.$el.parent().find('div[selected="selected"]').attr('selected', null);
                        this.$el.find('.sortable-item').attr('selected', 'selected');
                    }
                }),

                PluginSettingsView = Backbone.View.extend({
                    initialize: function (options) {
                    },
                    render: function () {
                        this.$el.empty().append(
                            $('<div>').append(
                                $('<div class="section">').append(
                                    $('<legend class="sectiontitle">').text(staticStrings.SUBREDDITS),
                                    $('<div class="settings-detail-pane">').append(
                                        $('<div class="listbox">'),
                                        $('<div class="sectioncontent">').append(
                                            $('<button class="btn" data-action="add" style="margin-right: 15px; ">').text(staticStrings.ADD),
                                            $('<button class="btn" data-action="edit" style="margin-right: 15px; ">').text(staticStrings.EDIT),
                                            $('<button class="btn" data-action="del" style="margin-right: 15px; ">').text(staticStrings.DELETE)
                                        ),
                                        $('<div class="settings sectiondelimiter">')
                                    )
                                )
                            )
                        );

                        var that = this;

                        function redraw() {
                            var $listbox = that.$el.find('.listbox'),
                                collection = new Backbone.Collection(subreddits);

                            $listbox.empty();

                            collection.each(function (item) {
                                $listbox.append(new SubredditSelectView({ model: item }).render().el);
                            });

                            if (collection.length === 0) {
                                $listbox.hide();
                            } else {
                                $listbox.show();
                            }

                            $listbox.sortable({
                                axis: 'y',
                                containment: 'parent',
                                update: function (event, ui) {
                                    subreddits = [];

                                    _.each($(this).sortable('toArray'), function (value) {
                                        var i = value.indexOf('#');
                                        var mode = value.substring(0, i),
                                            subreddit = value.substring(i + 1);

                                        subreddits.push({subreddit: subreddit, mode: mode});
                                    });

                                    settings.set('subreddits', subreddits);
                                    settings.save();

                                    ox.trigger("refresh^", [true]);
                                }
                            });
                        }

                        redraw();

                        this.on('redraw', redraw);

                        return this;
                    },
                    events: {
                        'click [data-action="add"]': 'onAdd',
                        'click [data-action="edit"]': 'onEdit',
                        'click [data-action="del"]': 'onDelete'
                    },

                    onAdd: function (args) {
                        var dialog = new dialogs.ModalDialog({
                            easyOut: true,
                            async: true
                        });

                        var $subreddit = $('<input>').attr({type: 'text', id: 'add_subreddit', placeholder: 'r/'});
                        var $mode = $('<select>')
                            .append($('<option>').attr('value', 'hot').text(gt('hot')))
                            .append($('<option>').attr('value', 'new').text(gt('new')));

                        var $error = $('<div>').addClass('alert alert-error').hide();

                        var that = this;

                        dialog.header($("<h4>").text(gt('Add a Subreddit')))
                            .append($subreddit)
                            .append($mode)
                            .append($error)
                            .addButton('cancel', gt('Cancel'))
                            .addButton('add', gt('Add'), null, {classes: 'btn-primary'})
                            .show();

                        dialog.on('add', function (e) {
                            $error.hide();

                            var subreddit = String($.trim($subreddit.val())),
                                deferred = $.Deferred();

                            // No dot and url does not end with tumblr.com? Append it!
                            if (subreddit.match(/^r\//)) {
                                subreddit = subreddit.substring(2);
                            }

                            // TODO Check if mode is OK
                            if (subreddit.length === 0) {
                                $error.text(gt('Please enter a subreddit.'));
                                deferred.reject();
                            } else {
                                $.ajax({
                                    url: 'http://www.reddit.com/r/' + subreddit + '/.json?jsonp=testcallback',
                                    type: 'HEAD',
                                    dataType: 'jsonp',
                                    jsonp: false,
                                    jsonpCallback: 'testcallback',
                                    success: function () {
                                        deferred.resolve();
                                    },
                                    error: function () {
                                        $error.text(gt('Unknown error while checking subreddit.'));
                                        deferred.reject();
                                    }
                                });
                            }

                            deferred.done(function () {
                                subreddits.push({subreddit: subreddit, mode: $mode.val()});
                                settings.set('subreddits', subreddits);
                                settings.save();

                                var extId = 'reddit-' + subreddit.replace(/[^a-z0-9]/g, '_') + '-' + $mode.val();
                                ext.point("io.ox/portal/widget").enable(extId);

                                require(['plugins/portal/reddit/register'], function (reddit) {
                                    reddit.reload();
                                    that.trigger('redraw');
                                    ox.trigger("refresh^");
                                    dialog.close();
                                });
                            });

                            deferred.fail(function () {
                                $error.show();
                                dialog.idle();
                            });
                        });
                    },
                    onEdit: function (args) {
                        var dialog = new dialogs.ModalDialog({
                            easyOut: true,
                            async: true
                        });

                        var oldSubreddit = this.$el.find('[selected]').data('subreddit'),
                            oldMode = this.$el.find('[selected]').data('mode');

                        if (oldSubreddit) {
                            oldSubreddit = String(oldSubreddit);
                            var $subreddit = $('<input>').attr({type: 'text', id: 'add_subreddit', placeholder: 'r/'}).val(oldSubreddit),
                                $error = $('<div>').addClass('alert alert-error').hide(),
                                that = this;

                            var $mode = $('<select>')
                                .append($('<option>').attr('value', 'hot').text(gt('hot')))
                                .append($('<option>').attr('value', 'new').text(gt('new')))
                                .val(oldMode);

                            dialog.header($("<h4>").text(gt('Edit a Subreddit')))
                                .append($subreddit)
                                .append($mode)
                                .append($error)
                                .addButton('cancel', gt('Cancel'))
                                .addButton('edit', gt('Edit'), null, {classes: 'btn-primary'})
                                .show();

                            dialog.on('edit', function (e) {
                                $error.hide();

                                var subreddit = String($.trim($subreddit.val())),
                                    mode = $mode.val(),
                                    deferred = $.Deferred();

                                // No dot and url does not end with tumblr.com? Append it!
                                if (subreddit.match(/^r\//)) {
                                    subreddit = subreddit.substring(2);
                                }

                                // TODO Check if mode is OK

                                if (subreddit.length === 0) {
                                    $error.text(gt('Please enter a subreddit.'));
                                    deferred.reject();
                                } else {
                                    $.ajax({
                                        url: 'http://www.reddit.com/r/' + subreddit + '/.json?jsonp=testcallback',
                                        type: 'HEAD',
                                        dataType: 'jsonp',
                                        jsonp: false,
                                        jsonpCallback: 'testcallback',
                                        success: function () {
                                            deferred.resolve();
                                        },
                                        error: function () {
                                            $error.text(gt('Unknown error while checking subreddit.'));
                                            deferred.reject();
                                        }
                                    });
                                }

                                deferred.done(function () {
                                    ext.point("io.ox/portal/widget").disable('reddit-' + oldSubreddit.replace(/[^a-z0-9]/g, '_') + '-' + oldMode.replace(/[^a-z0-9]/g, '_'));

                                    subreddits = removeSubReddit(subreddits, oldSubreddit, oldMode);

                                    subreddits.push({subreddit: subreddit, mode: mode});
                                    settings.set('subreddits', subreddits);
                                    settings.save();

                                    ext.point("io.ox/portal/widget").enable('reddit-' + subreddit.replace(/[^a-z0-9]/g, '_') + '-' + mode.replace(/[^a-z0-9]/g, '_'));

                                    require(['plugins/portal/reddit/register'], function (reddit) {
                                        reddit.reload();
                                        that.trigger('redraw');
                                        ox.trigger("refresh^");
                                        dialog.close();
                                    });
                                });

                                deferred.fail(function () {
                                    $error.show();
                                    dialog.idle();
                                });
                            });
                        }
                    },
                    onDelete: function (args) {
                        var dialog = new dialogs.ModalDialog({
                            easyOut: true
                        });

                        var subreddit = this.$el.find('[selected]').data('subreddit'),
                            mode = this.$el.find('[selected]').data('mode');

                        if (subreddit) {
                            subreddit = String(subreddit);
                            var that = this;

                            dialog.header($("<h4>").text(gt('Delete a Subreddit')))
                                .append($('<span>').text(gt('Do you really want to delete the following subreddit(s)?')))
                                .append($('<ul>').append($('<li>').text(subreddit + " (" + mode + ")")))
                                .addButton('cancel', gt('Cancel'))
                                .addButton('delete', gt('Delete'), null, {classes: 'btn-primary'})
                                .show()
                                .done(function (action) {
                                    if (action === 'delete') {
                                        var newSubreddits = [];
                                        _.each(subreddits, function (sub) {
                                            if (sub.subreddit !== subreddit || sub.subreddit === subreddit && sub.mode !== mode) {
                                                newSubreddits.push(sub);
                                            }
                                        });

                                        subreddits = removeSubReddit(subreddits, subreddit, mode);
                                        settings.set('subreddits', subreddits);
                                        settings.save();

                                        var extId = 'reddit-' + subreddit.replace(/[^a-z0-9]/g, '_') + '-' + mode.replace(/[^a-z0-9]/g, '_');

                                        ext.point("io.ox/portal/widget").disable(extId);

                                        require(['plugins/portal/reddit/register'], function (reddit) {
                                            reddit.reload();
                                            that.trigger('redraw');
                                            ox.trigger("refresh^");
                                        });
                                    }
                                    return false;
                                });
                        }
                    }
                }),

                removeSubReddit = function (subreddits, subreddit, mode) {
                    var newSubreddits = [];
                    _.each(subreddits, function (sub) {
                        if (sub.subreddit !== subreddit || sub.subreddit === subreddit && sub.mode !== mode) {
                            newSubreddits.push(sub);
                        }
                    });
                    return newSubreddits;
                };


                $(that).append(new PluginSettingsView().render().el);

            }); //END: require
        } //END: draw
    });




    /* * * * * *
     * TUMBLR
     */
    ext.point('io.ox/portal/settings/detail/tile').extend({
        index: 200,
        id: 'portal-settings-tumblr',
        draw : function (data) {
            var that = this;
            require(['settings!plugins/portal/tumblr', 'gettext!io.ox/portal', 'io.ox/core/tk/dialogs'], function (settings, gt, dialogs) {
                var blogs = settings.get('blogs'),
                staticStrings = {
                    TUMBLRBLOGS: gt('Tumblr-Blogs'),
                    ADD:         gt('Add'),
                    EDIT:        gt('Edit'),
                    DELETE:      gt('Delete')
                },
                BlogSelectView = Backbone.View.extend({
                    _modelBinder: undefined,
                    initialize: function (options) {
                        this._modelBinder = new Backbone.ModelBinder();
                    },
                    render: function () {
                        var self = this;

                        self.$el.empty().append(
                            $('<div class="io-ox-tumblr-setting">')
                            .attr({'data-url': this.model.get('url'),  'data-description': this.model.get('description')}).append(
                                $('<span data-property="url">'),
                                $('<i>').attr({'class': 'icon-edit', 'data-action': 'edit-feed', title: staticStrings.EDIT_FEED}),
                                $('<i>').attr({'class': 'icon-remove', 'data-action': 'del-feed', title: staticStrings.DELETE_FEED})
                            )
                        );

                        self.$el.attr('id', this.model.get('url'));

                        var defaultBindings = Backbone.ModelBinder.createDefaultBindings(self.el, 'data-property');
                        self._modelBinder.bind(self.model, self.el, defaultBindings);

                        return self;
                    },
                    events: {
                        'click .icon-remove': 'onDelete',
                        'click .icon-edit': 'onEdit'
                    },
                    onEdit: function (pEvent) {
                        var dialog = new dialogs.ModalDialog({
                            easyOut: true,
                            async: true
                        });
                        var $myNode = $(pEvent.target).parent(),
                            oldUrl = $myNode.data('url'),
                            oldDescription = $myNode.data('description');

                        if (oldUrl) {
                            var $url = $('<input>').attr({type: 'text', placeholder: '.tumblr.com'}).val(oldUrl),
                            $description = $('<input>').attr({type: 'text', placeholder: gt('Description')}).val(oldDescription),
                            $error = $('<div>').addClass('alert alert-error').hide(),
                            that = this;

                            dialog.header($("<h4>").text(gt('Edit a blog')))
                            .append($url)
                            .append($description)
                            .append($error)
                            .addButton('cancel', gt('Cancel'))
                            .addButton('edit', gt('Edit'), null, {classes: 'btn-primary'})
                            .show();

                            dialog.on('edit', function (e) {
                                $error.hide();

                                var url = $.trim($url.val()),
                                description = $.trim($description.val()),
                                deferred = $.Deferred();

                                // No dot and url does not end with tumblr.com? Append it!
                                if (url.indexOf('.') === -1 && !url.match(/\.tumblr\.com$/)) {
                                    url = url + '.tumblr.com';
                                }
                                if (url.match(/http:\/\//)) {
                                    url = url.substring('http://'.length);
                                }

                                if (url.length === 0) {
                                    $error.text(gt('Please enter an blog-url.'));
                                    deferred.reject();
                                } else if (description.length === 0) {
                                    $error.text(gt('Please enter a description.'));
                                    deferred.reject();
                                } else {
                                    $.ajax({
                                        url: 'https://api.tumblr.com/v2/blog/' + url + '/posts/?api_key=gC1vGCCmPq4ESX3rb6aUZkaJnQ5Ok09Y8xrE6aYvm6FaRnrNow&notes_info=&filter=&jsonp=testcallback',
                                        type: 'HEAD',
                                        dataType: 'jsonp',
                                        jsonp: false,
                                        jsonpCallback: 'testcallback',
                                        success: function (data) {
                                            if (data.meta && data.meta.status && data.meta.status === 200) {
                                                $myNode.data({url: url, description: description});
                                                deferred.resolve();
                                            } else {
                                                $error.text(gt('Unknown error while checking tumblr-blog.'));
                                                deferred.reject();
                                            }
                                        },
                                        error: function () {
                                            $error.text(gt('Unknown error while checking tumblr-blog.'));
                                            deferred.reject();
                                        }
                                    });
                                }

                                deferred.done(function () {
                                    ext.point("io.ox/portal/widget").disable('tumblr-' + oldUrl.replace(/[^a-zA-Z0-9]/g, '_'));

                                    blogs = removeBlog(blogs, oldUrl);

                                    blogs.push({url: url, description: description});
                                    settings.set('blogs', blogs);
                                    settings.save();

                                    ext.point("io.ox/portal/widget").enable('tumblr-' + url.replace(/[^a-zA-Z0-9]/g, '_'));

                                    require(['plugins/portal/tumblr/register'], function (tumblr) {
                                        tumblr.reload();
                                        that.trigger('redraw');
                                        ox.trigger("refresh^");
                                        dialog.close();
                                    });
                                });

                                deferred.fail(function () {
                                    $error.show();
                                    dialog.idle();
                                });
                            });
                        }
                    },
                    onDelete: function (pEvent) {
                        var dialog = new dialogs.ModalDialog({
                            easyOut: true
                        });
                        var $myNode = $(pEvent.target).parent(),
                            url = $myNode.data('url');

                        if (url) {
                            var that = this;

                            dialog.header($("<h4>").text(gt('Delete a Blog')))
                            .append($('<span>').text(gt('Do you really want to delete the following blog(s)?')))
                            .append($('<ul>').append($('<li>').text(url)))
                            .addButton('cancel', gt('Cancel'))
                            .addButton('delete', gt('Delete'), null, {classes: 'btn-primary'})
                            .show()
                            .done(function (action) {
                                if (action === 'delete') {
                                    blogs = removeBlog(blogs, url);
                                    settings.set('blogs', blogs);
                                    settings.save();
                                    $myNode.remove();
                                    var extId = 'tumblr-' + url.replace(/[^a-zA-Z0-9]/g, '_');

                                    ext.point("io.ox/portal/widget").disable(extId);
                                    require(['plugins/portal/tumblr/register'], function (tumblr) {
                                        ox.trigger("refresh^");
                                        tumblr.reload();
                                    });
                                }
                                return false;
                            });
                        }
                    }
                }),

                PluginSettingsView = Backbone.View.extend({
                    initialize: function (options) {
                    },
                    render: function () {
                        this.$el.empty().append(
                            $('<div>').append(
                                $('<div class="section">').append(
                                    $('<legend class="sectiontitle">').text(staticStrings.TUMBLRBLOGS),
                                    $('<div class="settings-detail-pane">').append(
                                        $('<div class="io-ox-tumblr-settings">')
                                    ),
                                    $('<div class="sectioncontent">').append(
                                        $('<button class="btn" data-action="add" style="margin-right: 15px; ">').text(staticStrings.ADD)
                                    ),
                                    $('<div class="settings sectiondelimiter">')
                                )
                            )
                        );
                        var that = this;
                        function redraw() {
                            var $settings = that.$el.find('.io-ox-tumblr-settings');
                            var collection = new Backbone.Collection(blogs);
                            $settings.empty();

                            collection.each(function (item) {
                                $settings.append(new BlogSelectView({ model: item }).render().el);
                            });

                            if (collection.length === 0) {
                                $settings.hide();
                            } else {
                                $settings.show();
                            }
                        }

                        redraw();

                        this.on('redraw', redraw);

                        return this;
                    },
                    events: {
                        'click [data-action="add"]': 'onAdd'
                    },

                    onAdd: function (args) {
                        var dialog = new dialogs.ModalDialog({
                            easyOut: true,
                            async: true
                        });

                        var $url = $('<input>').attr({type: 'text', placeholder: '.tumblr.com'}),
                            $description = $('<input>').attr({type: 'text', placeholder: gt('Description')}),
                            $error = $('<div>').addClass('alert alert-error').hide(),
                            that = this;

                        dialog.header($("<h4>").text(gt('Add a blog')))
                            .append($url)
                            .append($description)
                            .append($error)
                            .addButton('cancel', gt('Cancel'))
                            .addButton('add', gt('Add'), null, {classes: 'btn-primary'})
                            .show();

                        dialog.on('add', function (e) {
                            $error.hide();

                            var url = $.trim($url.val()),
                                description = $.trim($description.val()),
                                deferred = $.Deferred();

                            // No dot and url does not end with tumblr.com? Append it!
                            if (url.indexOf('.') === -1 && !url.match(/\.tumblr\.com$/)) {
                                url = url + '.tumblr.com';
                            }
                            if (url.match(/http:\/\//)) {
                                url = url.substring('http://'.length);
                            }

                            if (url.length === 0) {
                                $error.text(gt('Please enter an blog-url.'));
                                deferred.reject();
                            } else if (description.length === 0) {
                                $error.text(gt('Please enter a description.'));
                                deferred.reject();
                            } else {
                                $.ajax({
                                    url: 'https://api.tumblr.com/v2/blog/' + url + '/posts/?api_key=gC1vGCCmPq4ESX3rb6aUZkaJnQ5Ok09Y8xrE6aYvm6FaRnrNow&notes_info=&filter=&jsonp=testcallback',
                                    type: 'HEAD',
                                    dataType: 'jsonp',
                                    jsonp: false,
                                    jsonpCallback: 'testcallback',
                                    success: function (data) {
                                        if (data.meta && data.meta.status && data.meta.status === 200) {
                                            deferred.resolve();
                                        } else {
                                            $error.text(gt('Unknown error while checking tumblr-blog.'));
                                            deferred.reject();
                                        }
                                    },
                                    error: function () {
                                        $error.text(gt('Unknown error while checking tumblr-blog.'));
                                        deferred.reject();
                                    }
                                });
                            }

                            deferred.done(function () {
                                blogs.push({url: url, description: description});
                                settings.set('blogs', blogs);
                                settings.save();

                                var extId = 'tumblr-' + url.replace(/[^a-zA-Z0-9]/g, '_');
                                ext.point("io.ox/portal/widget").enable(extId);

                                require(['plugins/portal/tumblr/register'], function (tumblr) {
                                    tumblr.reload();
                                    that.trigger('redraw');
                                    ox.trigger("refresh^");
                                    dialog.close();
                                });
                            });

                            deferred.fail(function () {
                                $error.show();
                                dialog.idle();
                            });
                        });
                    }
                }),

                removeBlog = function (blogs, url) {
                    var newblogs = [];
                    _.each(blogs, function (sub) {
                        if (sub.url !== url) {
                            newblogs.push(sub);
                        }
                    });
                    return newblogs;
                };

                $(that).append(new PluginSettingsView().render().el);
            }); //END: require
        } //END: draw
    }); //END: extend



    /* * * * * *
     * FLICKR
     */
    ext.point('io.ox/portal/settings/detail/tile').extend({
        index: 300,
        id: 'portal-settings-flickr',
        draw : function (data) {
            var that = this;
            require(['settings!plugins/portal/flickr', 'gettext!io.ox/portal', 'io.ox/core/tk/dialogs'], function (settings, gt, dialogs) {
                var getFlickrNsid = function (username, $error) {
                    var callback = 'getFlickerNsid';
                    var myurl = 'https://www.flickr.com/services/rest/?api_key=7fcde3ae5ad6ecf2dfc1d3128f4ead81&format=json&method=flickr.people.findByUsername&username=' + username + '&jsoncallback=' + callback;

                    var deferred = $.Deferred();

                    $.ajax({
                        url: myurl,
                        dataType: 'jsonp',
                        jsonp: false,
                        jsonpCallback: callback,
                        success: function (data) {
                            if (data && data.stat && data.stat === 'ok') {
                                deferred.resolve(data.user.nsid);
                            } else {
                                deferred.reject();
                                $error.text(gt('Cannot find user with given name.'));
                            }
                        },
                        error: function () {
                            deferred.reject();
                            $error.text(gt('Cannot find user with given name.'));
                        }
                    });

                    return deferred;
                };

                var streams = settings.get('streams'),
                    staticStrings = {
                        STREAMS:    gt('Streams'),
                        ADD:        gt('Add'),
                        EDIT:       gt('Edit'),
                        DELETE:     gt('Delete')
                    },

                    StreamSelectView = Backbone.View.extend({
                        _modelBinder: undefined,
                        initialize: function (options) {
                            this._modelBinder = new Backbone.ModelBinder();
                        },
                        render: function () {
                            var self = this;

                            self.$el.empty().append(
                                $('<div class="io-ox-portal-flickr-setting">')
                                .attr({'data-q': this.model.get('q'), 'data-method': this.model.get('method'), 'data-description': this.model.get('description')}).append(
                                    $('<span data-property="q">'),
                                    $('<i class="icon-edit setting-action">'),
                                    $('<i class="icon-remove setting-action">')
                                )
                            );

                            var defaultBindings = Backbone.ModelBinder.createDefaultBindings(self.el, 'data-property');
                            self._modelBinder.bind(self.model, self.el, defaultBindings);

                            return self;
                        },
                        events: {
                            'click .icon-edit': 'onEdit',
                            'click .icon-remove': 'onDelete'
                        },
                        onEdit: function (pEvent) {
                            var dialog = new dialogs.ModalDialog({
                                easyOut: true,
                                async: true
                            }),
                                $myNode = $(pEvent.target).parent(),
                                oldQ = $myNode.data('q'),
                                oldMethod = $myNode.data('method'),
                                oldDescription = $myNode.data('description');
                            console.log("onEdit", $myNode);

                            if (oldQ && oldMethod) {
                                oldQ = String(oldQ);
                                var $q = $('<input>').attr({type: 'text', placeholder: gt('Search')}).val(oldQ);
                                var $description = $('<input>').attr({type: 'text', placeholder: gt('Description')}).val(oldDescription);
                                var $method = $('<select>')
                                .append($('<option>').attr('value', 'flickr.photos.search').text(gt('flickr.photos.search')))
                                .append($('<option>').attr('value', 'flickr.people.getPublicPhotos').text(gt('flickr.people.getPublicPhotos')))
                                .val(oldMethod);
                                var $error = $('<div>').addClass('alert alert-error').hide();

                                var that = this;

                                dialog.header($("<h4>").text(gt('Edit a stream')))
                                .append($q)
                                .append($description)
                                .append($method)
                                .append($error)
                                .addButton('cancel', gt('Cancel'))
                                .addButton('edit', gt('Edit'), null, {classes: 'btn-primary'})
                                .show();

                                dialog.on('edit', function (e) {
                                    $error.hide();

                                    var q = String($.trim($q.val())),
                                    method = $.trim($method.val()),
                                    description = $.trim($description.val()),
                                    deferred;

                                    if (method === 'flickr.people.getPublicPhotos') {
                                        deferred = getFlickrNsid(q, $error);
                                    } else {
                                        deferred = $.Deferred();
                                        deferred.resolve();
                                    }

                                    deferred.done(function (nsid) {
                                        if (q.length === 0) {
                                            $error.text(gt('Please enter a search-query.'));
                                            $error.show();
                                            dialog.idle();
                                        } else if (description.length === 0) {
                                            $error.text(gt('Please enter a description.'));
                                            $error.show();
                                            dialog.idle();
                                        } else {
                                            ext.point("io.ox/portal/widget").disable('flickr-' + oldQ.replace(/[^a-z0-9]/g, '_') + '-' + oldMethod.replace(/[^a-z0-9]/g, '_'));
                                            streams = removeStream(streams, oldQ, oldMethod);

                                            var newStream = {q: q, method: method, description: description};

                                            if (nsid) {
                                                newStream.nsid = nsid;
                                            }

                                            streams.push(newStream);
                                            settings.set('streams', streams);
                                            settings.save();

                                            ext.point("io.ox/portal/widget").enable('flickr-' + q.replace(/[^a-z0-9]/g, '_') + '-' + method.replace(/[^a-z0-9]/g, '_'));

                                            require(['plugins/portal/flickr/register'], function (flickr) {
                                                flickr.reload();
                                                that.trigger('redraw');
                                                ox.trigger("refresh^");
                                                dialog.close();
                                            });
                                        }
                                    });

                                    deferred.fail(function () {
                                        $error.show();
                                        dialog.idle();
                                    });
                                });
                            }
                        },
                        onDelete: function (pEvent) {
                            var dialog = new dialogs.ModalDialog({
                                    easyOut: true
                                }),
                                 $myNode = $(pEvent.target).parent(),
                                 q = $myNode.data('q'),
                                 method = $myNode.data('method');
                            console.log("Bla", q, method);
                            if (q && method) {
                                q = String(q);
                                var that = this;
                                console.log("Bla", q, method);

                                dialog.header($("<h4>").text(gt('Delete a stream')))
                                    .append($('<span>').text(gt('Do you really want to delete the following stream?')))
                                    .append($('<ul>').append(
                                        $('<li>').text(q + " (" + method + ")")
                                    ))
                                .addButton('cancel', gt('Cancel'))
                                .addButton('delete', gt('Delete'), null, {classes: 'btn-primary'})
                                .show()
                                .done(function (action) {
                                    if (action === 'delete') {
                                        var newStreams = [];
                                        _.each(streams, function (sub) {
                                            if (sub.q !== q || (sub.q === q && sub.method !== method)) {
                                                newStreams.push(sub);
                                            }
                                        });

                                        streams = removeStream(streams, q, method);
                                        settings.set('streams', streams);
                                        settings.save();

                                        $myNode.remove();
                                        var extId = 'flickr-' + q.replace(/[^a-z0-9]/g, '_') + '-' + method.replace(/[^a-z0-9]/g, '_');

                                        ext.point("io.ox/portal/widget").disable(extId);

                                        require(['plugins/portal/flickr/register'], function (flickr) {
                                            flickr.reload();
                                            ox.trigger("refresh^");
                                        });
                                    }
                                    return false;
                                });
                            }
                        }
                    }),

                    PluginSettingsView = Backbone.View.extend({
                        initialize: function (options) {
                        },
                        render: function () {
                            this.$el.empty().append(
                                $('<div>').append(
                                    $('<div class="section">').append(
                                        $('<legend class="sectiontitle">').text(staticStrings.STREAMS),
                                        $('<div class="settings-detail-pane">').append(
                                            $('<div class="io-ox-portal-flickr-settings">')
                                        ),
                                        $('<div class="sectioncontent">').append(
                                            $('<button class="btn" data-action="add" style="margin-right: 15px; ">').text(staticStrings.ADD)
                                        ),
                                        $('<div class="settings sectiondelimiter">')
                                    )
                                )
                            );

                            var that = this;

                            function redraw() {
                                var $listbox = that.$el.find('.io-ox-portal-flickr-settings');
                                var collection = new Backbone.Collection(streams);
                                $listbox.empty();

                                collection.each(function (item) {
                                    $listbox.append(new StreamSelectView({ model: item }).render().el);
                                });

                                if (collection.length === 0) {
                                    $listbox.hide();
                                } else {
                                    $listbox.show();
                                }
                            }

                            redraw();

                            this.on('redraw', redraw);

                            return this;
                        },
                        events: {
                            'click [data-action="add"]': 'onAdd'
                        },

                        onAdd: function (args) {
                            var dialog = new dialogs.ModalDialog({
                                easyOut: true,
                                async: true
                            });

                            var $q = $('<input>').attr({type: 'text', placeholder: gt('Search')});
                            var $description = $('<input>').attr({type: 'text', placeholder: gt('Description')});
                            var $method = $('<select>')
                                .append($('<option>').attr('value', 'flickr.photos.search').text(gt('flickr.photos.search')))
                                .append($('<option>').attr('value', 'flickr.people.getPublicPhotos').text(gt('flickr.people.getPublicPhotos')))
                                ;

                            var $error = $('<div>').addClass('alert alert-error').hide();

                            var that = this;

                            dialog.header($("<h4>").text(gt('Add a stream')))
                                .append($q)
                                .append($description)
                                .append($method)
                                .append($error)
                                .addButton('cancel', gt('Cancel'))
                                .addButton('add', gt('Add'), null, {classes: 'btn-primary'})
                                .show();

                            dialog.on('add', function (e) {
                                $error.hide();

                                var q = String($.trim($q.val())),
                                    method = $.trim($method.val()),
                                    description = $.trim($description.val()),
                                    deferred;

                                if (method === 'flickr.people.getPublicPhotos') {
                                    deferred = getFlickrNsid(q, $error);
                                } else {
                                    deferred = $.Deferred();
                                    deferred.resolve();
                                }

                                deferred.done(function (nsid) {
                                    if (q.length === 0) {
                                        $error.text(gt('Please enter a search-query.'));
                                        $error.show();
                                        dialog.idle();
                                    } else if (description.length === 0) {
                                        $error.text(gt('Please enter a description.'));
                                        $error.show();
                                        dialog.idle();
                                    } else {
                                        var newStream = {q: q, method: method, description: description};

                                        if (nsid) {
                                            newStream.nsid = nsid;
                                        }

                                        streams.push(newStream);
                                        settings.set('streams', streams);
                                        settings.save();

                                        var extId = 'flickr-' + q.replace(/[^a-z0-9]/g, '_') + '-' + method.replace(/[^a-z0-9]/g, '_');
                                        ext.point("io.ox/portal/widget").enable(extId);

                                        require(['plugins/portal/flickr/register'], function (flickr) {
                                            flickr.reload();
                                            that.trigger('redraw');
                                            ox.trigger("refresh^");
                                            dialog.close();
                                        });
                                    }
                                });

                                deferred.fail(function () {
                                    $error.show();
                                    dialog.idle();
                                });
                            });
                        }
                    }),

                    removeStream = function (streams, q, method) {
                        var newStreams = [];

                        _.each(streams, function (sub) {
                            if (sub.q !== q || sub.q === q && sub.method !== method) {
                                newStreams.push(sub);
                            }
                        });
                        return newStreams;
                    };

                $(that).append(new PluginSettingsView().render().el);
            }); //END: require
        } //END: draw
    }); //END: extend





    /* * * * * *
     * RSS
     */
    ext.point('io.ox/portal/settings/detail/tile').extend({
        index: 400,
        id: 'portal-settings-rss',
        draw : function (data) {
            var that = this;
            require(['settings!plugins/portal/rss', 'gettext!io.ox/portal', 'io.ox/core/tk/dialogs', 'io.ox/messaging/accounts/api'],
            function (settings, gt, dialogs, accountApi) {
                var feedgroups = settings.get('groups'),
                    staticStrings = {
                        RSS: gt('RSS'),
                        ADD_FEED: gt('Add feed'),
                        ADD_GROUP: gt('Add group'),
                        EDIT_FEED: gt('Edit feed'),
                        EDIT_GROUP: gt('Edit group'),
                        DELETE_FEED: gt('Delete feed'),
                        DELETE_GROUP: gt('Delete group')
                    };
                console.log("My feedgroups", feedgroups);
                var migrateIfNecessary = function () {
                        if (!settings.get('needsMigration')) {
                            return;
                        }
                        var members = [];
                        var group = {groupname: gt('RSS Feeds'), index: 100, members: members};

                        accountApi.all('com.openexchange.messaging.rss').done(function (accounts) {
                            var index = 0;
                            _(accounts).each(function (account) {
                                index += 100;
                                members.push({url: account.configuration.url, feedname: account.displayName, index: index});
                            });
                            settings.set('groups', [group]);
                            settings.save();
                            settings.set('needsMigration', false);
                            settings.save();
                        });
                    },
                    FeedGroupView = Backbone.View.extend({
                        _modelBinder: undefined,
                        initialize: function (options) {
                            this._modelBinder = new Backbone.ModelBinder();
                        },
                        render: function () {
                            var self = this,
                                groupname = self.model.attributes.groupname,
                                members = self.model.attributes.members,
                                id = 'rss-feedgroup-' + groupname.replace(/[^A-Za-z0-9]/g, '_');

                            self.$el.empty().append(
                                $('<div>').attr({'class': 'io-ox-portal-rss-settings-feedgroup', id: id, 'data-groupname': groupname}).append(
                                    $('<strong>').text(groupname),
                                    $('<i>').attr({'class': 'icon-edit', 'data-action': 'edit-group', title: staticStrings.EDIT_GROUP}),
                                    $('<i>').attr({'class': 'icon-remove', 'data-action': 'del-group', title: staticStrings.DELETE_GROUP}),
                                    $('<i>').attr({'class': 'icon-plus', 'data-action': 'add-feed', title: staticStrings.ADD_FEED})
                                ),
                                $('<div class="io-ox-portal-rss-settings-members">').append(_(members).map(function (member) {
                                    return $('<div>').attr({'id': 'rss-feed-' + member.feedname.replace(/[^A-Za-z0-9]/g, '_'),
                                            'class': 'io-ox-portal-rss-settings-member sortable-item',
                                            'data-url': member.url,
                                            'data-feedname': member.feedname,
                                            'data-group': groupname}).append(
                                        $('<span class="io-ox-portal-rss-feedname">').text(member.feedname),
                                        $('<span class="io-ox-portal-rss-feedurl">').text(member.url),
                                        $('<i>').attr({'class': 'icon-edit', 'data-action': 'edit-feed', title: staticStrings.EDIT_FEED}),
                                        $('<i>').attr({'class': 'icon-remove', 'data-action': 'del-feed', title: staticStrings.DELETE_FEED})
                                    );
                                }))
                            );

                            // Used by jquery ui sortable
                            self.$el.attr('id', id);

                            var defaultBindings = Backbone.ModelBinder.createDefaultBindings(self.el, 'data-property');
                            self._modelBinder.bind(self.model, self.el, defaultBindings);

                            return self;
                        },
                        events: {
                            'click .sortable-item': 'onSelect'
                        },
                        onSelect: function (args) {
                            this.$el.parent().find('[selected]').removeAttr('selected');
                            $(args.srcElement).parent().attr('selected', 'selected');
                        }
                    }),



                    PluginSettingsView = Backbone.View.extend({
                        initialize: function (options) {
                            if (feedgroups) {
                                return;
                            }
                            migrateIfNecessary();

                            feedgroups = settings.get('groups');
                            if (feedgroups) {
                                return;
                            }
                            feedgroups = [];
                            settings.set('groups', feedgroups);
                            settings.save();
                        },
                        render: function () {
                            this.$el.empty().append(
                                $('<div>').append(
                                    $('<div class="section">').append(
                                        $('<legend class="sectiontitle">').text(staticStrings.RSS),
                                        $('<div class="settings-detail-pane">').append(
                                            $('<div class="listbox">')
                                        ),
                                        $('<div class="sectioncontent">').append(
                                            $('<button class="btn" data-action="add-feed" style="margin-right: 15px; ">').text(staticStrings.ADD_FEED),
                                            $('<button class="btn" data-action="add-group" style="margin-right: 15px; ">').text(staticStrings.ADD_GROUP)
                                        ),
                                        $('<div class="settings sectiondelimiter"></div>')
                                    )
                                )
                            );

                            var that = this;

                            function redraw() {
                                var $listbox = that.$el.find('.listbox');
                                var collection = new Backbone.Collection(feedgroups);
                                $listbox.empty();

                                collection.each(function (item) {
                                    $listbox.append(new FeedGroupView({ model: item }).render().el);
                                });

                                if (collection.length === 0) {
                                    $listbox.hide();
                                } else {
                                    $listbox.show();
                                }

                                $listbox.sortable({
                                    axis: 'y',
                                    containment: 'parent',
                                    update: function (event, ui) {
                                        var newfeedgroups = [];

                                        _.each($(this).sortable('toArray'), function (url) {
                                            var oldData = _.find(feedgroups, function (blog) { return (blog.url === url); });

                                            if (oldData) {
                                                newfeedgroups.push(oldData);
                                            }
                                        });
                                        feedgroups = newfeedgroups;
                                        settings.set('groups', feedgroups);
                                        settings.save();

                                        ox.trigger("refresh^", [true]);
                                    }
                                });
                            }

                            redraw();

                            this.on('redraw', redraw);

                            return this;
                        },
                        events: {
                            'click [data-action="add-feed"]': 'onAddFeed',
                            'click [data-action="edit-feed"]': 'onEditFeed',
                            'click [data-action="del-feed"]': 'onDeleteFeed',
                            'click [data-action="add-group"]': 'onAddGroup',
                            'click [data-action="edit-group"]': 'onEditGroup',
                            'click [data-action="del-group"]': 'onDeleteGroup'
                        },
                        makeFeedgroupSelection: function (highlight) {
                            var $select = $('<select>');

                            _(feedgroups).each(function (feedgroup) {
                                var $option = $('<option>').text(feedgroup.groupname);
                                if (feedgroup.groupname === highlight) {
                                    $option.attr({selected: 'selected'});
                                }
                                $select.append($option);
                            });

                            if (!feedgroups || feedgroups.length === 0) {
                                $select.append($('<option>').attr({value: 'Default group'}).text('Default group'));
                            }

                            return $select;
                        },
                        onAddFeed: function (args) {
                            var dialog = new dialogs.ModalDialog({ easyOut: true, async: true }),
                                $url = $('<input>').attr({type: 'text', placeholder: gt('http://')}),
                                $feedname = $('<input>').attr({type: 'text', placeholder: gt('Description')}),
                                callerGroupname = $(this.$el.find('[selected]')).data('groupname'),
                                $group = this.makeFeedgroupSelection(callerGroupname),
                                $error = $('<div>').addClass('alert alert-error').hide(),
                                that = this;

                            dialog.header($("<h4>").text(gt('Add a feed')))
                                .append($url)
                                .append($feedname)
                                .append($group)
                                .append($error)
                                .addButton('cancel', gt('Cancel'))
                                .addButton('add', gt('Add'), null, {classes: 'btn-primary'})
                                .show();

                            dialog.on('add', function (e) {
                                var url = $.trim($url.val()),
                                    description = $.trim($feedname.val()),
                                    groupname = $.trim($group.val()),
                                    deferred = $.Deferred(),
                                    newFeed;

                                $error.hide();

                                if (url.length === 0) {
                                    $error.text(gt('Please enter a feed-url.'));
                                    deferred.reject();
                                } else if (description.length === 0) {
                                    $error.text(gt('Please enter a description.'));
                                    deferred.reject();
                                } else {
                                    //TODO add test for existence of feed
                                    newFeed = {feedname: description, url: url, index: 100};
                                    deferred.resolve();
                                }

                                deferred.done(function () { //TODO
                                    if (_(feedgroups).any(function (group) { return group.groupname === groupname; })) {
                                        var group = _(feedgroups).find(function (group) {return group.groupname === groupname; });
                                        group.members.push(newFeed);
                                    } else {
                                        feedgroups.push({ groupname: groupname, index: 100, members: [newFeed]});
                                    }
                                    settings.set('groups', feedgroups);
                                    settings.save();

                                    that.trigger('redraw');
                                    ox.trigger("refresh^");

                                    dialog.close();
                                });

                                deferred.fail(function () {
                                    $error.show();
                                    dialog.idle();
                                });
                            });
                        },


                        onAddGroup: function (args) {
                            var dialog = new dialogs.ModalDialog({ easyOut: true, async: true });

                            var $description = $('<input>').attr({type: 'text', placeholder: gt('Description')}),
                                $error = $('<div>').addClass('alert alert-error').hide(),
                                that = this;

                            dialog.header($("<h4>").text(gt('Add a new group for your feeds')))
                                .append($description)
                                .append($error)
                                .addButton('cancel', gt('Cancel'))
                                .addButton('add', gt('Add'), null, {classes: 'btn-primary'})
                                .show();

                            dialog.on('add', function (e) {
                                var description = $.trim($description.val()),
                                    deferred = $.Deferred(),
                                    newFeedgroup;

                                $error.hide();

                                if (description.length === 0) {
                                    $error.text(gt('Please enter a description.'));
                                    deferred.reject();
                                } else {
                                    //TODO add test for existence of group name
                                    newFeedgroup = {groupname: description, index: 100, members: []};
                                    deferred.resolve();
                                }

                                deferred.done(function () { //TODO
                                    feedgroups.push(newFeedgroup);
                                    settings.set('groups', feedgroups);
                                    settings.save();

                                    that.trigger('redraw');
                                    ox.trigger("refresh^");

                                    dialog.close();
                                });

                                deferred.fail(function () {
                                    $error.show();
                                    dialog.idle();
                                });
                            });
                        },


                        onEditFeed: function (args) {
                            var dialog = new dialogs.ModalDialog({easyOut: true, async: true }),
                                $changed = $(this.$el.find('[selected]'));

                            var oldUrl = $changed.data('url'),
                                oldFeedname = $changed.data('feedname'),
                                oldGroupname = $changed.data('group');

                            if (!oldUrl) {
                                return;
                            }
                            var $url = $('<input>').attr({type: 'text'}).val(oldUrl),
                                $feedname = $('<input>').attr({type: 'text', placeholder: gt('Name of feed')}).val(oldFeedname),
                                $groups = this.makeFeedgroupSelection(oldGroupname),
                                $error = $('<div>').addClass('alert alert-error').hide(),
                                that = this;

                            dialog.header($("<h4>").text(gt('Edit a feed')))
                                .append($url)
                                .append($feedname)
                                .append($groups)
                                .append($error)
                                .addButton('cancel', gt('Cancel'))
                                .addButton('edit', gt('Edit'), null, {classes: 'btn-primary'})
                                .show();

                            dialog.on('edit', function (e) {
                                $error.hide();

                                var url = $.trim($url.val()),
                                    feedname = $.trim($feedname.val()),
                                    groups = $groups.val(),
                                    deferred = $.Deferred();

                                if (url.length === 0) {
                                    $error.text(gt('Please enter an feed-url.'));
                                    deferred.reject();
                                } else if (feedname.length === 0) {
                                    $error.text(gt('Please enter a name for the feed.'));
                                    deferred.reject();
                                } else {
                                    //TODO add test for existence of feed
                                    deferred.resolve();
                                }

                                deferred.done(function () {
                                    var oldGroup = _(feedgroups).find(function (g) {return g.groupname === oldGroupname; }),
                                        newGroup = _(feedgroups).find(function (g) {return g.groupname === groups; });
                                    oldGroup.members = removeFeed(oldGroup.members, oldUrl);
                                    newGroup.members.push({url: url, feedname: feedname});

                                    settings.set('groups', feedgroups);
                                    settings.save();

                                    that.trigger('redraw');
                                    ox.trigger("refresh^");
                                    dialog.close();
                                });

                                deferred.fail(function () {
                                    $error.show();
                                    dialog.idle();
                                });
                            });
                        },
                        onEditGroup: function (pEvent) {
                            var dialog = new dialogs.ModalDialog({easyOut: true, async: true }),
                                $changed = $(pEvent.target).parent();

                            var oldGroupname = $changed.data('groupname');

                            if (!oldGroupname) {
                                return;
                            }
                            var $groupname = $('<input>').attr({type: 'text', placeholder: gt('Name for group of feeds')}).val(oldGroupname),
                                $error = $('<div>').addClass('alert alert-error').hide(),
                                that = this;

                            dialog.header($("<h4>").text(gt('Edit a group of feeds')))
                                .append($groupname)
                                .append($error)
                                .addButton('cancel', gt('Cancel'))
                                .addButton('edit', gt('Edit'), null, {classes: 'btn-primary'})
                                .show();

                            dialog.on('edit', function (e) {
                                $error.hide();

                                var groupname = $.trim($groupname.val()),
                                    deferred = $.Deferred();

                                if (groupname.length === 0) {
                                    $error.text(gt('Please enter a name for the group of feeds.'));
                                    deferred.reject();
                                } else {
                                    deferred.resolve();
                                }

                                deferred.done(function () {
                                    var oldGroup = _(feedgroups).find(function (g) {return g.groupname === oldGroupname; });
                                    oldGroup.groupname = groupname;

                                    settings.set('groups', feedgroups);
                                    settings.save();

                                    that.trigger('redraw');
                                    ox.trigger("refresh^");
                                    dialog.close();
                                });

                                deferred.fail(function () {
                                    $error.show();
                                    dialog.idle();
                                });
                            });
                        },


                        onDeleteFeed: function (args) {
                            var dialog = new dialogs.ModalDialog({
                                easyOut: true
                            });
                            var deleteme = this.$el.find('[selected]'),
                                url = deleteme.data('url'),
                                groupname = deleteme.data('group');

                            if (!url) {
                                return;
                            }
                            var that = this;

                            dialog.header($("<h4>").text(gt('Delete a feed')))
                                .append($('<span>').text(gt('Do you really want to delete the following feed(s)?'))) //TODO i18n
                                .append($('<ul>').append($('<li>').text(url)))
                                .addButton('cancel', gt('Cancel'))
                                .addButton('delete', gt('Delete'), null, {classes: 'btn-primary'})
                                .show()
                                .done(function (action) {
                                    if (action === 'delete') {
                                        var newGroup = _(feedgroups).find(function (g) {return g.groupname === groupname; });
                                        newGroup.members = removeFeed(newGroup.members, url);

                                        settings.set('groups', feedgroups);
                                        settings.save();

                                        that.trigger('redraw');
                                        ox.trigger("refresh^");
                                        dialog.close();
                                    }
                                    return false;
                                });
                        },


                        onDeleteGroup: function (pEvent) {
                            var dialog = new dialogs.ModalDialog({
                                easyOut: true
                            });
                            var deleteme = $(pEvent.target).parent(),
                                groupname = deleteme.data('groupname');
                            if (!groupname) {
                                return;
                            }
                            var that = this;

                            dialog.header($("<h4>").text(gt('Delete a group of feeds')))
                                .append($('<span>').text(gt('Do you really want to delete the following group of feeds?'))) //TODO i18n
                                .append($('<ul>').append(
                                    $('<li>').text(groupname)))
                                .addButton('cancel', gt('Cancel'))
                                .addButton('delete', gt('Delete'), null, {classes: 'btn-primary'})
                                .show()
                                .done(function (action) {
                                    if (action === 'delete') {
                                        feedgroups = feedgroups.filter(function (groups) { return groups.groupname !== groupname; });
                                        settings.set('groups', feedgroups);
                                        settings.save();

                                        that.trigger('redraw');
                                        ox.trigger("refresh^");
                                    }
                                    return false;
                                });
                        }
                    }),
                    removeFeedgroup = function (feedgroups, groupname) {
                        var newfeedgroups = [];
                        _.each(feedgroups, function (group) {
                            if (group.groupname !== groupname) {
                                newfeedgroups.push(group);
                            }
                        });
                        return newfeedgroups;
                    },
                    removeFeed = function (members, url) {
                        var newmembers = [];
                        _.each(members, function (member) {
                            if (member.url !== url) {
                                newmembers.push(member);
                            }
                        });
                        return newmembers;
                    };
                console.log("My feedgroups", feedgroups);
                $(that).append(new PluginSettingsView().render().el);
            }); //END: require
        } //END: draw
    }); //END: extend
});