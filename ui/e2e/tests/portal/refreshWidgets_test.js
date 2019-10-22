/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2018 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Olena Stute <olena.stute@open-xchange.com>
 */
/// <reference path="../../steps.d.ts" />

const moment = require('moment');

Feature('Portal');

Before(async (users) => {
    await users.create();
});

After(async (users) => {
    await users.removeAll();
});

async function addAppointment(I, user, wave) {
    const appointmentDefaultFolder = await I.grabDefaultFolder('calendar');
    const hour = wave * 4;
    await I.haveAppointment({
        summary: `Appointment-${wave}`,
        folder: `cal://0/${appointmentDefaultFolder}`,
        startDate: { value: moment().add(hour, 'hours').format('YYYYMMDD[T]HHmm00') },
        endDate: { value: moment().add(hour + 1, 'hours').format('YYYYMMDD[T]HHmm00') }
    });
}

async function addMail(I, user, wave) {
    var person = [user.get('displayname'), user.get('primaryEmail')];
    await I.haveMail({ from: [person], to: [person], sendtype: 0, subject: `Mail-${wave}` });
}

async function addFile(I, user, wave, name) {
    const infostoreFolderID = await I.grabDefaultFolder('infostore');
    await I.haveFile(infostoreFolderID, `e2e/media/files/generic/${name}`);
}

function check(I, count) {
    I.waitNumberOfVisibleElements('.widget[aria-label="Inbox"] ul li', count, 40);
    I.waitNumberOfVisibleElements('.widget[aria-label="Appointments"] ul li', count, 40);
    I.waitNumberOfVisibleElements('.widget[aria-label="Recently changed files"] ul li', count, 40);
}

Scenario('[C7494] Refresh widgets', async (I, users, portal) => {
    const [user] = users;

    await I.haveSetting({
        'io.ox/core': { refreshInterval: 100, autoOpenNotification: false, showDesktopNotifications: false },
        'io.ox/portal': { widgets: { user: '{}' } }
    });

    I.say('Adding some items');
    await addMail(I, user, 1);
    await addAppointment(I, user, 1);
    await addFile(I, user, 1, 'testdocument.odt');

    I.say('Login');
    I.login('app=io.ox/portal');
    portal.ready();

    I.say('Adding widgets');
    portal.addWidget('Inbox');
    portal.addWidget('Appointments');
    portal.addWidget('Recently changed files');
    check(I, 1);

    I.say('Adding more items');
    await addMail(I, user, 2);
    await addAppointment(I, user, 2);
    await addFile(I, user, 1, 'testdocument.rtf');
    check(I, 2);

    // hint: removed part for valdating bug 64548 cause...
    // - covered only this very special bug scenario
    // - will never happen again (easy fix)
    // - would delay this testcase for 30 seconds (widgets have a throttled refresh)
});
