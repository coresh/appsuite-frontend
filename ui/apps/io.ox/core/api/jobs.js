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
 * @author Daniel Dickhaus <daniel.dickhaus@open-xchange.com>
 */

define('io.ox/core/api/jobs', [
    'io.ox/core/http',
    'gettext!io.ox/core'
], function (http, gt) {

    'use strict';

    var longRunningJobs = {}, jobTimer;

    var api = {

        updateJobTimer: function () {
            // timer is running although there are no jobs, stop it
            if (_(longRunningJobs).size() === 0 && jobTimer) {
                clearInterval(jobTimer);
                jobTimer = null;
                return;
            }
            // there is already a jobtimer running, nothing to be done here
            if (jobTimer) return;

            jobTimer = setInterval(function () {
                api.getInfo(_(longRunningJobs).keys()).done(function (data) {
                    var doneJobs = {};
                    _(data).each(function (job) {
                        if (job.data.done) {
                            doneJobs[job.data.id] = longRunningJobs[job.data.id];
                            delete longRunningJobs[job.data.id];
                        }
                    });
                    api.updateJobTimer();

                    if (_(doneJobs).size === 0) return;

                    _(_(doneJobs).keys()).each(function (key) {
                        var job = doneJobs[key];
                        api.get(job.id).done(function (result) {
                            if (result.error && doneJobs[job.id].failCallback) {
                                doneJobs[job.id].failCallback(result);
                            } else if (doneJobs[job.id].successCallback) {
                                doneJobs[job.id].successCallback(result);
                            }

                            api.trigger('finished:' + job.id, result);
                            // used to trigger redraw of folderview
                            api.trigger('finished:' + job.showIn, result);
                        });
                    });
                });
            }, 60000);
        },
        get: function (id) {
            if (!id) {
                return $.when();
            }

            return http.GET({
                module: 'jobs',
                params: {
                    action: 'get',
                    id: id
                }
            });
        },
        getInfo: function (ids) {
            ids = [].concat(ids);
            if (_.isEmpty(ids)) {
                return $.when();
            }
            http.pause();

            _(ids).each(function (id) {
                http.GET({
                    module: 'jobs',
                    params: {
                        action: 'info',
                        id: id
                    }
                });
            });
            return http.resume();
        },
        getAll: function () {
            return http.GET({
                module: 'jobs',
                params: {
                    action: 'all'
                }
            }).done(function (jobs) {
                _(jobs).each(function (job) {
                    api.addJob(_.extend({
                        // only infostore for now
                        showIn: 'infostore',
                        //#. %1$s: Folder name
                        label: job.folder && job.folder.title ? gt('Moving "%1$s"', job.folder.title) : gt('Moving folder'),
                        // use generic fallback
                        successCallback: function () { ox.trigger('refresh.all'); },
                        failCallback: function () { ox.trigger('refresh.all'); }
                    }, job));
                });
            });
        },
        cancelJob: function (ids) {
            ids = [].concat(ids);
            if (_.isEmpty(ids)) {
                return $.when();
            }

            return http.PUT({
                module: 'jobs',
                params: {
                    action: 'cancel'
                },
                data: ids
            }).then(function () {
                _(ids).each(function (id) {
                    delete longRunningJobs[id];
                });

                api.updateJobTimer();
            });
        },
        addJob: function (job) {
            if (!job || longRunningJobs[job.id]) return;

            longRunningJobs[job.id] = job;

            api.trigger('added:' + job.id, { job: longRunningJobs[job.id] });
            api.trigger('added:' + job.showIn, { job: longRunningJobs[job.id] });
            // start the timer
            api.updateJobTimer();
        },
        getCurrentList: function (showIn) {
            if (showIn) {
                return _(longRunningJobs).where({ 'showIn': showIn });
            }

            return longRunningJobs;
        }
    };

    _.extend(api, Backbone.Events);

    return api;
});