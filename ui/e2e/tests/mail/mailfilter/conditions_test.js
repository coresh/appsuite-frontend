/**
* This work is provided under the terms of the CREATIVE COMMONS PUBLIC
* LICENSE. This work is protected by copyright and/or other applicable
* law. Any use of the work other than as authorized under this license
* or copyright law is prohibited.
*
* http://creativecommons.org/licenses/by-nc-sa/2.5/
* © 2019 OX Software GmbH, Germany. info@open-xchange.com
*
* @author Christoph Kopp <christoph.kopp@open-xchange.com>
*/

/// <reference path="../../../steps.d.ts" />

Feature('Mailfilter');

Before(async function (users) {
    await users.create();
    await users.create();
});

After(async function (users) {
    await users.removeAll();
});

function createFilterRule(I, name, condition, value, flag) {
    I.login('app=io.ox/settings');
    I.waitForVisible('.io-ox-settings-main');
    I.waitForElement({ css: 'li .folder[data-id="virtual/settings/io.ox/mail"]>.folder-node' });
    I.selectFolder('Mail');
    I.waitForVisible('.rightside h1');

    // open mailfilter settings
    I.selectFolder('Filter Rules');

    // checks the h1 and the empty message
    I.waitForVisible('.io-ox-settings-window .settings-detail-pane .io-ox-mailfilter-settings h1');
    I.see('Mail Filter Rules');

    I.see('There is no rule defined');

    // create a test rule and check the inintial display
    I.click('Add new rule');
    I.waitForText('Create new rule');
    I.see('This rule applies to all messages. Please add a condition to restrict this rule to specific messages.');
    I.see('Please define at least one action.');

    I.fillField('rulename', name);

    // add condition
    I.click('Add condition');
    I.click(condition);
    I.fillField('values', value);

    // add action
    I.click('Add action');
    I.click('Set color flag');
    I.click('.actions .dropdown-toggle');
    I.waitForVisible('.flag-dropdown');
    I.click(flag, '.flag-dropdown');

}

Scenario('[C7792] Filter mail on sender', async function (I, users, mail) {
    let [user] = users;
    await I.haveSetting({
        'io.ox/mail': { messageFormat: 'text' }
    });

    createFilterRule(I, 'TestCase0368', 'From', user.get('primaryEmail'), 'Blue');
    // save the form
    I.click('Save');
    I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]');

    I.openApp('Mail');
    mail.waitForApp();
    // compose mail
    mail.newMail();

    I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'));
    I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0368');
    I.fillField({ css: 'textarea.plain-text' }, 'This is a test');
    I.seeInField({ css: 'textarea.plain-text' }, 'This is a test');

    mail.send();
    I.waitForElement('~Sent, 1 total. Right click for more options.', 30);
    I.waitForElement('~Inbox, 1 unread, 1 total. Right click for more options.', 30);
    I.waitForElement('.vsplit .flag_2', 30);

});

Scenario('[C7793] Filter mail on any recipient', async function (I, users, mail) {
    let [user] = users;
    await I.haveSetting({
        'io.ox/mail': { messageFormat: 'text' }
    });

    createFilterRule(I, 'TestCase0369', 'Any recipient', user.get('primaryEmail'), 'Red');
    // save the form
    I.click('Save');
    I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]');

    I.openApp('Mail');
    mail.waitForApp();

    // compose mail
    mail.newMail();
    I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'));
    I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0369');
    I.fillField({ css: 'textarea.plain-text' }, 'This is a test');
    I.seeInField({ css: 'textarea.plain-text' }, 'This is a test');

    mail.send();
    I.waitForElement('~Sent, 1 total. Right click for more options.', 30);
    I.waitForElement('~Inbox, 1 unread, 1 total. Right click for more options.', 30);
    I.waitForElement('.vsplit .flag_1', 30);

});

Scenario('[C7794] Filter mail on to-field', async function (I, users, mail) {
    let [user] = users;
    await I.haveSetting({
        'io.ox/mail': { messageFormat: 'text' }
    });

    createFilterRule(I, 'TestCase0373', 'To', user.get('primaryEmail'), 'Red');
    // save the form
    I.click('Save');
    I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]');

    I.openApp('Mail');
    mail.waitForApp();

    // compose mail
    mail.newMail();
    I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'));
    I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0373');
    I.fillField({ css: 'textarea.plain-text' }, 'This is a test');
    I.seeInField({ css: 'textarea.plain-text' }, 'This is a test');

    mail.send();
    I.waitForElement('~Sent, 1 total. Right click for more options.', 30);
    I.waitForElement('~Inbox, 1 unread, 1 total. Right click for more options.', 30);
    I.waitForElement('.vsplit .flag_1', 30);

});

Scenario('[C7795] Filter mail on subject', async function (I, users, mail) {
    let [user] = users;
    await I.haveSetting({
        'io.ox/mail': { messageFormat: 'text' }
    });

    createFilterRule(I, 'TestCase0374', 'Subject', 'TestCase0374', 'Red');
    // save the form
    I.click('Save');
    I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]');

    I.openApp('Mail');
    mail.waitForApp();

    // compose mail
    mail.newMail();
    I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'));
    I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0374');
    I.fillField({ css: 'textarea.plain-text' }, 'This is a test');
    I.seeInField({ css: 'textarea.plain-text' }, 'This is a test');

    mail.send();
    I.waitForElement('~Sent, 1 total. Right click for more options.', 30);
    I.waitForElement('~Inbox, 1 unread, 1 total. Right click for more options.', 30);
    I.waitForElement('.vsplit .flag_1', 30);
});

Scenario('[C7796] Filter mail on cc-field', async function (I, users, mail) {
    let [user] = users;
    await I.haveSetting({
        'io.ox/mail': { messageFormat: 'text' }
    });

    createFilterRule(I, 'TestCase0375', 'Cc', user.get('primaryEmail'), 'Red');
    // save the form
    I.click('Save');
    I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]');

    I.openApp('Mail');
    mail.waitForApp();

    // compose mail
    mail.newMail();
    I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'));
    I.click('CC');
    I.fillField('.io-ox-mail-compose div[data-extension-id="cc"] input.tt-input', user.get('primaryEmail'));

    I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0375');
    I.fillField({ css: 'textarea.plain-text' }, 'This is a test');
    I.seeInField({ css: 'textarea.plain-text' }, 'This is a test');

    mail.send();
    I.waitForElement('~Sent, 1 total. Right click for more options.', 30);
    I.waitForElement('~Inbox, 1 unread, 1 total. Right click for more options.', 30);
    I.waitForElement('.vsplit .flag_1', 30);
});

Scenario('[C7797] Filter mail on header', async function (I, users, mail) {
    let [user] = users;
    await I.haveSetting({
        'io.ox/mail': { messageFormat: 'text' }
    });

    createFilterRule(I, 'TestCase0381', 'Header', user.get('primaryEmail'), 'Red');
    I.click('Matches');
    I.waitForVisible('.open.dropdownlink');
    I.click('Contains');
    I.fillField('headers', 'Delivered-To');
    // save the form
    I.click('Save');
    I.waitForVisible('.settings-detail-pane li.settings-list-item[data-id="0"]');

    I.openApp('Mail');
    mail.waitForApp();

    // compose mail
    mail.newMail();
    I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', user.get('primaryEmail'));

    I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0381');
    I.fillField({ css: 'textarea.plain-text' }, 'This is a test');
    I.seeInField({ css: 'textarea.plain-text' }, 'This is a test');

    mail.send();
    I.waitForElement('~Sent, 1 total. Right click for more options.', 30);
    I.waitForElement('~Inbox, 1 unread, 1 total. Right click for more options.', 30);
    I.waitForElement('.vsplit .flag_1', 30);
});

Scenario('[C7800] Filter mail on envelope', async function (I, users, mail) {

    await I.haveSetting({
        'io.ox/mail': { messageFormat: 'text' }
    });

    createFilterRule(I, 'TestCase0384', 'Envelope', users[0].get('primaryEmail'), 'Red');
    I.click('Is exactly');
    I.waitForVisible('.open.dropdownlink');
    I.click('Contains');

    // save the form
    I.click('Save');
    I.waitForVisible('.io-ox-settings-window .settings-detail-pane li.settings-list-item[data-id="0"]');

    I.openApp('Mail');
    mail.waitForApp();

    // compose mail
    mail.newMail();
    I.fillField('.io-ox-mail-compose div[data-extension-id="to"] input.tt-input', users[1].get('primaryEmail'));
    I.click('BCC');
    I.fillField('.io-ox-mail-compose div[data-extension-id="bcc"] input.tt-input', users[0].get('primaryEmail'));

    I.fillField('.io-ox-mail-compose [name="subject"]', 'TestCase0384');
    I.fillField({ css: 'textarea.plain-text' }, 'This is a test');
    I.seeInField({ css: 'textarea.plain-text' }, 'This is a test');

    mail.send();
    I.waitForElement('~Sent, 1 total. Right click for more options.', 30);
    I.waitForElement('~Inbox, 1 unread, 1 total. Right click for more options.', 30);
    I.waitForElement('.vsplit .flag_1', 30);
});
