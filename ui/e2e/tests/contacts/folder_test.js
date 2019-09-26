/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2019 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Markus Wagner <markus.wagner@open-xchange.com>
 */

/// <reference path="../../steps.d.ts" />

Feature('Contacts > Folder');

Before(async (users) => {
    await users.create();
    await users.create();
});

After(async (users) => {
    await users.removeAll();
});

Scenario('[C85620] Global address book is the default folder - switch capability for user', async function (I, users) {

    // Make sure user has the global address book enabled
    await users[0].hasCapability('gab');

    I.login('app=io.ox/contacts');

    // The global address book is shown
    I.waitForElement(locate('span.folder-name').withText('Global address book'), 10);

    // This async script execution is needed because codecept otherwise doesn't execute the test in a correct order
    await I.executeScript(function () {
        return require('io.ox/core/capabilities').has('gab');
    });

    I.logout();

    // Disable the global address book for the user
    await users[0].doesntHaveCapability('gab');

    I.login('app=io.ox/contacts');

    // The users contacts folder is shown
    I.waitForElement(locate('span.folder-name').withText('Contacts'), 10);

    // This async script execution is needed because codecept otherwise doesn't execute the test in a correct order
    await I.executeScript(function () {
        return require('io.ox/core/capabilities').has('gab');
    });
});

Scenario('[C85620] Global address book is the default folder - check first login', async function (I, users) {

    // Make sure user has the global address book enabled
    await users[1].doesntHaveCapability('gab');

    I.login('app=io.ox/contacts', { user: users[1] });

    // The users contacts folder is shown
    I.waitForElement(locate('span.folder-name').withText('Contacts'), 10);

    // The global address book isn't shown
    I.dontSeeElement(locate('span.folder-name').withText('Global address book'));

    // This async script execution is needed because codecept otherwise doesn't execute the test in a correct order
    await I.executeScript(function () {
        return require('io.ox/core/capabilities').has('gab');
    });

    I.logout();
});

Scenario('[C7355] - Create a new private folder', function (I) {
    const timestamp = Math.round(+new Date() / 1000);
    I.login('app=io.ox/contacts');
    // wait for any contact to be rendered, this is the last thing happening on load.
    I.waitForElement('.vgrid-cell.contact');
    I.click('Add new address book');
    I.waitForElement('.modal-open [data-point="io.ox/core/folder/add-popup"]');
    I.fillField('[name="name"]', 'C7355 ' + timestamp);
    I.click('[data-action="add"]');
    I.waitForDetached('[data-point="io.ox/core/folder/add-popup"]');
    I.selectFolder('C7355 ' + timestamp);
    I.waitForText('C7355 ' + timestamp, '.folder-name');
});

Scenario('[C7356] - Create a new public folder', function (I) {
    const timestamp = Math.round(+new Date() / 1000);
    I.login('app=io.ox/contacts');
    I.waitForVisible('*[data-app-name="io.ox/contacts"]');
    I.waitForVisible('.classic-toolbar [data-action]');
    I.waitForText('Add new address book');
    I.click('Add new address book');
    I.waitForElement('.modal-open [data-point="io.ox/core/folder/add-popup"]');
    I.fillField('[name="name"]', 'C7356 ' + timestamp);
    I.click('.modal-open .checkbox label');
    I.click('[data-action="add"]');
    I.waitForDetached('[data-point="io.ox/core/folder/add-popup"]');
    I.selectFolder('C7356 ' + timestamp);
    I.waitForText('C7356 ' + timestamp, '.folder-name');
    I.waitForText('C7356 ' + timestamp, '[data-id="virtual/flat/contacts/public"] .folder-node');
});
