/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2018 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Christoph Kopp <chrsitoph.kopp@open-xchange.com>
 */

const moment = require('moment');

Feature('Portal');

Before(async function (users) {
    await users.create();
});

After(async function (users) {
    await users.removeAll();
});

// if the month changes between today and tomorrow
async function goToDate(I, date) {
    var day = await I.executeScript(function (date) {
        const monthName = moment(date).format('MMMM');
        if (monthName !== $('.switch-mode').text().split(' ')[0]) {
            $('.btn-next').click();
        }
        return moment(date).format('M/DD/YYYY');
    }, date);
    I.click({ css: `td[aria-label*="${day}"` });
}

Scenario('Create new appointment and check display in portal widget', async function (I, calendar) {
    // add one day to secure that the appointment will be in the future
    const day = moment().startOf('day').add('1', 'day').add('1', 'hour');

    I.login('app=io.ox/calendar');
    calendar.waitForApp();
    I.selectFolder('Calendar');
    I.clickToolbar('View');
    I.click('List', '.dropdown.open .dropdown-menu');
    I.dontSeeElement('.appointment');

    // make sure portal widget is empty
    I.openApp('Portal');
    I.waitForVisible('.io-ox-portal [data-widget-id="calendar_0"]');
    I.see('You don\'t have any appointments in the near future.', { css: '[data-widget-id="calendar_0"] li.line' });

    I.openApp('Calendar');
    I.clickToolbar('View');
    I.click('List', '.dropdown.open .dropdown-menu');

    // create in List view
    I.selectFolder('Calendar');
    I.clickToolbar('View');
    I.click('List', '.dropdown.open .dropdown-menu');
    I.clickToolbar('New appointment');
    I.waitForVisible('.io-ox-calendar-edit-window');

    I.fillField('Subject', 'test portal widget');
    I.fillField('Location', 'portal widget location');
    I.fillField('.time-field', '2:00 PM');
    await calendar.setDate('startDate', day);

    // save
    I.click('Create', '.io-ox-calendar-edit-window');
    I.waitForDetached('.io-ox-calendar-edit-window', 5);

    // check in week view
    I.clickToolbar('View');
    I.click('Week');
    await goToDate(I, day);
    I.waitForVisible('.weekview-container.week button.weekday.today');

    I.see('test portal widget', '.weekview-container.week .appointment .title');
    I.seeNumberOfElements('.weekview-container.week .appointment .title', 1);

    // check in portal
    I.openApp('Portal');
    I.waitForVisible('.io-ox-portal [data-widget-id="calendar_0"] li.item div');
    I.see('test portal widget', { css: '[data-widget-id="calendar_0"] li.item div' });

    // create a second appointment
    I.openApp('Calendar');
    I.waitForVisible({ css: '[data-app-name="io.ox/calendar"]' }, 5);
    I.clickToolbar('View');
    I.click('List', '.dropdown.open .dropdown-menu');

    // create in List view
    I.selectFolder('Calendar');
    I.clickToolbar('View');
    I.click('List', '.dropdown.open .dropdown-menu');
    I.clickToolbar('New appointment');
    I.waitForVisible('.io-ox-calendar-edit-window');

    I.fillField('Subject', 'second test portal widget ');
    I.fillField('Location', 'second portal widget location');
    I.fillField('.time-field', '2:00 PM');
    await calendar.setDate('startDate', day);

    // save
    I.click('Create', '.io-ox-calendar-edit-window');
    I.waitForVisible('.modal-dialog');
    I.click('Ignore conflicts', '.modal-dialog');
    I.waitForDetached('.io-ox-calendar-edit-window', 5);

    // check in week view
    I.clickToolbar('View');
    I.click('Week', '.dropdown.open .dropdown-menu');
    await goToDate(I, day);
    I.waitForVisible('.weekview-container.week button.weekday.today');
    I.seeNumberOfElements('.weekview-container.week .appointment .title', 2);
});
