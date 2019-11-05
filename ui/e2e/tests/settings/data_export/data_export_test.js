/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2019 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Daniel Dickhaus <daniel.dickhaus@open-xchange.com>
 */

/// <reference path="../../../steps.d.ts" />

Feature('Settings > Data export (GDPR)');

Before(async function (users) {
    await users.create();
});

After(async function (users) {
    await users.removeAll();
});

Scenario('request a new download and cancel it', async function (I) {
    I.login('app=io.ox/settings');

    I.waitForText('Download personal data', 5);

    I.click('Download personal data');
    I.waitForText('Download your personal data');

    within('.io-ox-personal-data-settings', () => {

        // click some options
        I.uncheckOption('Drive');
        I.uncheckOption('Tasks');
        I.uncheckOption('Calendar');
    });

    // click suboption
    var optionsLocator = locate({ css: '.io-ox-personal-data-settings [data-toggle="dropdown"]' }).first();
    I.click(optionsLocator);
    I.click('.smart-dropdown-container.open a[data-name="includeTrash"]');

    // check if suboption is enabled
    I.click(optionsLocator);
    I.seeElement('.smart-dropdown-container.open a[data-name="includeTrash"] .fa-check');
    I.pressKey('Escape');

    within('.io-ox-personal-data-settings', () => {
        // select a filesize
        I.selectOption('select', '512 MB');

        I.click('Request download');

        // check if view switches correctly and buttons are disabled
        I.waitForText(
            'Your requested archive is currently being created. Depending on the size of the requested data this may take hours or days. You will be informed via email when your download is ready.',
            1,
            '.personal-data-download-view'
        );

        I.seeElement('input:disabled');

        // cancel again, we don't want to clutter the filesystem
        I.click('Cancel download request');
    });

    I.waitForText('Do you really want to cancel the current download request?', 5);
    I.click('Cancel download request', '.modal-dialog');

    within('.io-ox-personal-data-settings', () => {
        // check if view switches correctly and buttons are enabled again
        I.waitForInvisible('.personal-data-download-view', 1);

        I.dontSeeElement('input:disabled');
    });
});

Scenario('open direct link to data export settings page', async function (I) {
    I.login('app=io.ox/settings&folder=virtual/settings/personaldata');

    //list view
    I.waitForText('Download personal data', 5);

    // no click here, direct link should do the work

    // detail view
    I.waitForText('Download your personal data', 5);
});

Scenario('show only available options', async function (I, users) {
    await I.dontHaveCapability('tasks', users[0]);
    I.login('app=io.ox/settings');

    I.waitForText('Download personal data', 5);

    I.click('Download personal data');
    I.waitForText('Download your personal data');

    //check if calendar module is correctly missing
    I.dontSee('Tasks', '.io-ox-personal-data-settings label');

    // sub options cannot be tested with capabilities alone, options must be removed in config
});