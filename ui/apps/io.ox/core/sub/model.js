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
 * @author Julian Bäume <julian.baeume@open-xchange.com>
 */

define('io.ox/core/sub/model', [
    'io.ox/core/extensions',
    'io.ox/backbone/basicModel',
    'io.ox/core/api/sub',
    'io.ox/settings/util',
    'gettext!io.ox/core/sub'
], function (ext, BasicModel, api, settingsUtil, gt) {

    'use strict';

    function createSyncer(api) {
        return {
            create: function (model) {
                return settingsUtil.yellOnReject(
                    api.create(model.attributes)
                );
            },
            read: function (model) {
                return api.get({ id: model.id, folder: model.get('folder') });
            },
            update: function (model) {
                return settingsUtil.yellOnReject(
                    api.update(model.attributes)
                );
            },
            destroy: function (model) {
                return settingsUtil.yellOnReject(
                    api.destroy(model.id)
                );
            }
        };
    }

    var Subscription = BasicModel.extend({
            ref: 'io.ox/core/sub/subscription/',
            url: function () {
                return this.attributes[this.attributes.source].url;
            },
            source: function () {
                return this.attributes[this.attributes.source];
            },
            setSource: function (source, obj) {
                delete this.attributes[this.attributes.source];
                this.attributes.source = source.id;
                this.attributes[this.attributes.source] = obj || {};
            },
            /**
             * Get the state concerning refresh.
             *
             * Knows three different states:
             * - 'ready' - ready to perform a refresh
             * - 'pending' - performing a refresh at the moment
             * - 'done' - refresh is already done
             *
             * @return { string} - the state
             */
            refreshState: function () {
                return this._refresh ? this._refresh.state() : 'ready';
            },
            performRefresh: function () {
                if (this.refreshState() === 'ready') {
                    api.subscriptions.refresh(this);
                    return (this._refresh = _.wait(5000));
                }
                return this._refresh;
            },
            syncer: createSyncer(api.subscriptions)
        }),
        PubSubCollection = {
            factory: function (api) {
                return Backbone.Collection.extend({
                    initialize: function () {
                        var collection = this;
                        api.on('refresh:all', function () {
                            collection.fetch();
                        });
                        this.on('change:enabled', function (model) {
                            model.collection.sort();
                        });
                    },
                    sync: function (method, collection) {
                        if (method !== 'read') return;
                        var self = this;

                        return api.getAll().then(function (res) {
                            _(res).each(function (obj) {
                                var my_model = new self.model(obj);
                                my_model.fetch().then(function (my_model) {
                                    return collection.add(my_model);
                                });
                            });
                            collection.each(function (model) {
                                if (model && _(res).where({ id: model.id }).length === 0) {
                                    collection.remove(model);
                                }
                            });
                            return collection;
                        });
                    },
                    /**
                     * get a list of items for a folder
                     *
                     * If no folder is provided, all items will be returned.
                     *
                     * Use it like:
                     * <code>
                     *   model.collection.forFolder({ folder_id: 2342 });
                     * </code>
                     *
                     * @param {object} - an object containing a folder_id attribute
                     * @return [model] - an array containing matching model objects
                     */
                    forFolder: filterFolder,
                    comparator: function (publication) {
                        return !publication.get('enabled') + String(publication.get('displayName')).toLowerCase();
                    }
                });
            }
        },
        Subscriptions = PubSubCollection.factory(api.subscriptions).extend({
            model: Subscription
        }),
        //singleton instances
        subscriptions;

    function filterFolder(folder) {
        var filter = String(folder.folder_id || folder.folder || '');

        if (!filter) { return this.toArray(); }

        return this.filter(function (e) {
            return (e.get('entity') || { folder: e.get('folder') }).folder === filter;
        });
    }

    ext.point('io.ox/core/sub/subscription/validation').extend({
        validate: function (obj, errors) {
            var ref = obj[obj.source];
            if (!ref) return errors.add(obj.source, gt('Model is incomplete.'));

            _((obj.service || {}).formDescription).each(function (field) {
                if (!field.mandatory || ref[field.name]) return;
                //#. %1$s is a name/label of an input field (for example: URL or Login)
                //#, c-format
                errors.add(obj.source, gt('%1$s must not be empty.', field.displayName));
            });
        }
    });

    return {
        subscriptions: function () {
            if (!subscriptions) {
                subscriptions = new Subscriptions();
            }
            subscriptions.fetch();

            return subscriptions;
        },
        Subscription: Subscription
    };
});
