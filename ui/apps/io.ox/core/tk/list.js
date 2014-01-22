/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2013 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/core/tk/list',
    ['io.ox/core/tk/list-selection',
     'io.ox/core/extensions',
     'gettext!io.ox/core'
    ], function (Selection, ext) {

    'use strict';

    var keyEvents = {
        13: 'enter',
        27: 'escape',
        32: 'space',
        37: 'cursor:left',
        38: 'cursor:up',
        39: 'cursor:right',
        40: 'cursor:down'
    };

    var NOOP = function () { return $.when(); };

    var ListView = Backbone.View.extend({

        tagName: 'ul',
        className: 'list-view',

        // a11y: use role=option and aria-selected here; no need for "aria-posinset" or "aria-setsize"
        // see http://blog.paciellogroup.com/2010/04/html5-and-the-myth-of-wai-aria-redundance/
        scaffold: $(
            '<li class="list-item selectable" tabindex="-1" role="option" aria-selected="false">' +
            '<div class="list-item-checkmark"><i class="icon-checkmark"/></div>' +
            '<div class="list-item-content"></div>' +
            '</li>'
        ),

        busyIndicator: $('<li class="list-item busy-indicator"><i class="icon-chevron-down"/></li>'),

        events: {
            'focus .list-item': 'onItemFocus',
            'blur .list-item': 'onItemBlur',
            'keydown .list-item': 'onItemKeydown',
            'scroll': 'onScroll'
        },

        onItemFocus: function () {
            this.$el.removeAttr('tabindex');
            if (this.ignoreFocus !== true) this.$el.addClass('has-focus');
        },

        onItemBlur: function () {
            this.$el.attr('tabindex', 1);
            if (this.ignoreFocus !== true) this.$el.removeClass('has-focus');
        },

        onItemKeydown: function (e) {
            if (keyEvents[e.which]) this.trigger(keyEvents[e.which], e);
        },

        onScroll: _.debounce(function () {

            if (this.isBusy || this.complete) return;

            var height = this.$el.height(),
                scrollTop = this.$el.scrollTop(),
                scrollHeight = this.$el.prop('scrollHeight'),
                tail = scrollHeight - (scrollTop + height),
                length = this.collection.length;

            // do anything?
            if (tail > height) return;
            // show indicator
            this.addBusyIndicator();
            // really refresh?
            if (tail > 0) return;
            // load more
            (this.busy().paginate() || $.when()).then(
                // success
                function checkIfComplete() {
                    // if collection hasn't grown we assume that it's complete
                    if (this.collection.length <= length) this.toggleComplete(true);
                    this.idle();
                }.bind(this),
                // fails
                this.idle
            );

        }, 50),

        // called when the view model changes (not collection models)
        onModelChange: function () {
            this.empty();
            this.busy();
            (this.load() || $.when()).always(this.idle);
        },

        empty: function () {
            this.idle();
            this.toggleComplete(false);
            this.$el.empty();
            this.selection.reset();
            this.$el.scrollTop(0);
        },

        onReset: function () {
            this.empty();
            this.$el.append(
                this.collection.map(this.renderListItem, this)
            );
        },

        onAdd: function (model) {

            this.idle();

            var index = model.get('index'),
                children = this.getItems(),
                li = this.renderListItem(model);

            // insert or append
            if (index < children.length) children.eq(index).before(li); else this.$el.append(li);
            this.selection.add(model.cid, li);

            if (li.position().top <= 0) {
                this.$el.scrollTop(this.$el.scrollTop() + li.outerHeight(true));
            }
        },

        onRemove: function (model) {

            var li = this.$el.find('li[data-cid="' + model.cid + '"]'),
                top = this.$el.scrollTop();

            if (li.length === 0) return;

            if (li.position().top < top) {
                this.$el.scrollTop(top - li.outerHeight(true));
            }

            this.selection.remove(model.cid, li);
            li.remove();
        },

        // called whenever a model inside the collection changes
        onChange: function (model) {
            var li = this.$el.find('li[data-cid="' + model.cid + '"]'),
                data = model.toJSON(),
                baton = ext.Baton({ data: data, model: model, app: this.app });
            // draw via extensions
            ext.point(this.ref + '/item').invoke('draw', li.children().eq(1).empty(), baton);
        },

        initialize: function (options) {

            this.ref = this.ref || options.ref;
            this.app = options.app;
            this.selection = new Selection(this);
            this.model = new Backbone.Model();
            this.isBusy = false;
            this.complete = false;
            this.ignoreFocus = !!options.ignoreFocus;

            // permenent visual focus
            if (this.ignoreFocus) this.$el.addClass('has-focus');

            // don't know why but listenTo doesn't work here
            this.model.on('change', this.onModelChange, this);

            // make sure busy & idle use proper this (for convenient callbacks)
            _.bindAll(this, 'busy', 'idle');

            // set special class if not on smartphones (different behavior)
            if (_.device('!touch && !smartphone')) this.$el.addClass('visible-selection');
        },

        setCollection: function (collection) {
            // remove listeners
            this.stopListening(this.collection);
            this.collection = collection;
            this.toggleComplete(false);
            this.listenTo(collection, {
                add: this.onAdd,
                change: this.onChange,
                remove: this.onRemove,
                reset: this.onReset
            });
            this.selection.reset();
            return this;
        },

        // if true current collection is regarded complete
        // no more items are fetches
        toggleComplete: function (state) {
            this.$el.toggleClass('complete', state);
            this.complete = !!state;
        },

        // shows/hides checkboxes
        toggleCheckboxes: function (state) {
            this.$el.toggleClass('hide-checkboxes', state === undefined ? undefined : !state);
        },

        // return alls items of this list
        // the filter is important, as we might have a header
        getItems: function () {
            return this.$el.children('.list-item');
        },

        connect: function (loader) {

            this.collection = loader.getDefaultCollection();
            this.loader = loader;

            this.load = function () {
                // load data
                return loader.load(this.model.toJSON())
                .done(function (collection) {
                    this.setCollection(collection);
                    this.onReset();
                }.bind(this));
            };

            this.paginate = function () {
                return loader.paginate(this.model.toJSON());
            };

            this.reload = function () {
                return loader.reload(this.model.toJSON());
            };
        },

        load: NOOP,
        paginate: NOOP,
        reload: NOOP,

        // // generate composite keys (might differ from _.cid)
        // cid: function (data) {
        //     return _.cid(data);
        // },

        render: function () {
            this.$el.attr({
                'aria-multiselectable': true,
                'data-ref': this.ref,
                'role': 'listbox',
                'tabindex': 1
            });
            return this;
        },

        redraw: function () {
            var point = ext.point(this.ref + '/item'),
                collection = this.collection,
                app = this.app;
            this.getItems().each(function (index) {
                if (index >= collection.length) return;
                var model = collection.at(index),
                    baton = ext.Baton({ data: model.toJSON(), model: model, app: app });
                point.invoke('draw', $(this).children().eq(1).empty(), baton);
            });
        },

        renderListItem: function (model) {
            var li = this.scaffold.clone(),
                baton = ext.Baton({ data: model.toJSON(), model: model, app: this.app });
            // add cid and full data
            li.attr('data-cid', model.cid);
            // draw via extensions
            ext.point(this.ref + '/item').invoke('draw', li.children().eq(1), baton);
            return li;
        },

        getBusyIndicator: function () {
            return this.$el.find('.list-item.busy-indicator');
        },

        addBusyIndicator: function () {
            var indicator = this.getBusyIndicator();
            return indicator.length ? indicator : this.busyIndicator.clone().appendTo(this.$el);
        },

        removeBusyIndicator: function () {
            this.getBusyIndicator().remove();
        },

        busy: function () {
            if (this.isBusy) return;
            this.addBusyIndicator().addClass('io-ox-busy').find('i').remove();
            this.isBusy = true;
            return this;
        },

        idle: function () {
            if (!this.isBusy) return;
            this.removeBusyIndicator();
            this.isBusy = false;
            return this;
        }
    });

    return ListView;
});
