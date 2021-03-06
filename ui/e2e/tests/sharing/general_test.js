/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2019 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Julian Bäume <julian.baeume@open-xchange.com>
 *
 */

const { expect } = require('chai');

/// <reference path="../../steps.d.ts" />

Feature('Sharing');

Before(async (users) => {
    await users.create();
});

After(async (users) => {
    await users.removeAll();
});

Scenario('[C45021] Generate simple link for sharing', async function (I, drive, dialogs) {
    I.login('app=io.ox/files');
    drive.waitForApp();

    const myfiles = locate('.folder-tree .folder-label').withText('My files');
    I.waitForElement(myfiles);
    I.selectFolder('Music');
    drive.shareItem('Create sharing link');
    let url = await I.grabValueFrom('.share-wizard input[type="text"]');
    url = Array.isArray(url) ? url[0] : url;
    dialogs.clickButton('Close');
    I.waitForDetached('.modal-dialog');
    I.logout();

    I.amOnPage(Array.isArray(url) ? url[0] : url);
    drive.waitForApp();
    I.dontSee('Documents', '.list-view');
    I.see('Music', '.folder-tree .selected');
});

// TODO: shaky (element (.list-view) is not in DOM or there is no element(.list-view) with text "A subfolder" after 5 sec)
Scenario('[C252159] Generate link for sharing including subfolders', async function (I, drive, dialogs) {
    I.login('app=io.ox/files');
    drive.waitForApp();

    const myfiles = locate('.folder-tree .folder-label').withText('My files');
    I.say('Share folder with subfolder');
    I.waitForElement(myfiles);
    I.selectFolder('Music');
    I.waitForDetached('.page.current .busy');
    I.clickToolbar('New');
    I.waitForVisible('.dropdown.open .dropdown-menu');
    I.clickDropdown('Add new folder');
    dialogs.waitForVisible();
    I.waitForText('Add new folder', dialogs.locators.header);
    I.fillField('Folder name', 'A subfolder');
    dialogs.clickButton('Add');
    I.waitForDetached('.modal-dialog');
    I.clickToolbar('New');
    I.waitForVisible('.dropdown.open .dropdown-menu');
    I.clickDropdown('Add new folder');
    dialogs.waitForVisible();
    I.fillField('Folder name', 'Second subfolder');
    dialogs.clickButton('Add');
    I.waitForDetached('.modal-dialog');
    I.selectFolder('My files');
    I.waitForElement(locate('.filename').withText('Music').inside('.list-view'));
    I.click(locate('.filename').withText('Music').inside('.list-view'));
    drive.shareItem('Create sharing link');
    const url = await I.grabValueFrom('.share-wizard input[type="text"]');
    dialogs.clickButton('Close');
    I.waitForDetached('.modal-dialog');
    I.logout();

    I.say('Check sharing link');
    I.amOnPage(Array.isArray(url) ? url[0] : url);
    drive.waitForApp();
    I.waitForText('A subfolder', 5, '.list-view');
    I.seeNumberOfVisibleElements('.list-view li.list-item', 2);
    I.see('Second subfolder');
});

Scenario('[C45022] Generate simple link for sharing with password', async function (I, drive, dialogs) {
    I.login('app=io.ox/files');
    drive.waitForApp();
    const myfiles = locate('.folder-tree .folder-label').withText('My files');
    I.waitForElement(myfiles);
    I.selectFolder('Music');

    I.say('Create sharing link wiht password');
    drive.shareItem('Create sharing link');
    I.click('Password required');
    I.waitForFocus('.share-wizard input[type="password"]');
    I.fillField('Enter Password', 'CorrectHorseBatteryStaple');
    I.seeCheckboxIsChecked('Password required');
    let url = await I.grabValueFrom('.share-wizard input[type="text"]');
    url = Array.isArray(url) ? url[0] : url;
    dialogs.clickButton('Close');
    I.waitForDetached('.modal-dialog');
    I.triggerRefresh();
    I.logout();

    I.say('Check sharing link');
    I.amOnPage(Array.isArray(url) ? url[0] : url);
    I.waitForFocus('input[name="password"]');
    I.fillField('Password', 'CorrectHorseBatteryStaple');
    I.click('Sign in');
    drive.waitForApp();
    I.see('Music', '.folder-tree .selected');
});

// TODO: works perfect locally but breaks remotely for puppeteer and webdriver
// Reason: With --no-sandbox, clipboard cannot be accessed
Scenario.skip('[C83385] Copy to clipboard @puppeteer', async function (I, drive, dialogs) {
    await I.allowClipboardRead();
    I.login('app=io.ox/files');
    drive.waitForApp();
    const myfiles = locate('.folder-tree .folder-label').withText('My files');
    I.waitForElement(myfiles);
    I.selectFolder('Music');
    drive.waitForApp();
    drive.shareItem('Create sharing link');
    I.waitForVisible('.clippy');
    let url = await I.grabValueFrom('.share-wizard input[type="text"]');
    url = Array.isArray(url) ? url[0] : url;
    I.click('~Copy to clipboard');
    I.waitForText('Copied');
    const clipboard = await I.executeScript(function () {
        return navigator.clipboard.readText();
    });
    expect(clipboard).to.equal(url);
    dialogs.clickButton('Close');
    I.waitForDetached('.modal-dialog');
    I.logout();
    I.amOnPage(url);
    I.waitForText('Music');
});
// TODO: shaky (element (.fa-spin.fa-refresh) still not present on page after 30 )
Scenario('[C85625] My Shares default sort order', async function (I, drive, dialogs) {
    function share(item) {
        I.retry(5).click(locate('li.list-item').withText(item));
        drive.shareItem('Create sharing link');
        dialogs.clickButton('Close');
        I.waitForDetached('.modal-dialog');
    }
    function selectAndWait(folder) {
        I.selectFolder(folder);
        drive.waitForApp();
        I.waitForText(folder, undefined, '.breadcrumb-view.toolbar-item');
    }
    const folder = await I.grabDefaultFolder('infostore');
    await I.haveFile(folder, 'e2e/media/files/0kb/document.txt');
    const testFolder = await I.haveFolder({ title: 'Testfolder', module: 'infostore', parent: folder });
    await Promise.all([
        I.haveFile(testFolder, 'e2e/media/files/0kb/document.txt'),
        I.haveFile(testFolder, 'e2e/media/files/generic/testdocument.rtf'),
        I.haveFile(testFolder, 'e2e/media/files/generic/testdocument.odt'),
        I.haveFile(testFolder, 'e2e/media/files/generic/testpresentation.ppsm')
    ]);
    I.login('app=io.ox/files&folder=' + folder);
    drive.waitForApp();
    share('document.txt');
    selectAndWait('Testfolder');
    share('testdocument.rtf');
    share('testpresentation.ppsm');
    selectAndWait('My files');
    share('Testfolder');

    selectAndWait('My shares');
    I.waitForText('Testfolder', undefined, '.myshares-list');
    expect(await I.grabTextFrom(locate('li.list-item .displayname'))).to.deep.equal(['Testfolder', 'testpresentation.ppsm', 'testdocument.rtf', 'document.txt']);
    I.click('Sort by');
    I.seeElement(locate('i.fa-check').inside(locate('.dropdown a').withText('Date')));
    I.seeElement(locate('i.fa-check').inside(locate('.dropdown a').withText('Descending')));
    I.pressKey('Escape');
});
