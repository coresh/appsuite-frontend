/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2019 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Frank Paczynski <frank.paczynski@open-xchange.com>
 */

/// <reference path="../../../steps.d.ts" />

Feature('Mail Compose');

Before(async (users) => {
    await users.create(); // Sender
    await users.create(); // Recipient1
    await users.create(); // Recipient2
    await users.create(); // Recipient3
    await users.create(); // Recipient4
});

After(async (users) => {
    await users.removeAll();
});

// TODO fix drag&drop to work with puppeteer
// Might require a fix in the d&d code of the tokenfield
Scenario('[C8832] Re-order recipients', async function (I, users, mail) {

    let [sender, recipient1, recipient2, recipient3, recipient4] = users;

    const mailSubject = 'C8832 Move recipients between between field';

    const tokenLabelFor = user => `${user.get('given_name')} ${user.get('sur_name')}`;
    const dragTarget = user => `~${user.get('given_name')} ${user.get('sur_name')} ${user.get('primaryEmail')}`;
    const dropTarget = fieldClass => {
        return { css: `[data-extension-id="${fieldClass}"] .tokenfield` };
    };
    const tokenSelector = token => {
        return { css: `[data-extension-id="${token}"] .token` };
    };

    await I.haveSetting('io.ox/mail//features/registerProtocolHandler', false);

    I.login('app=io.ox/mail', { user: sender });
    mail.newMail();
    I.click('~Maximize');
    I.click('CC');
    I.click('BCC');

    I.fillField('Subject', mailSubject);

    // add a recipient for all fields
    I.fillField('To', recipient1.get('primaryEmail'));
    I.waitForVisible('.focus .tt-dropdown-menu');
    I.pressKey('Enter');
    I.see(tokenLabelFor(recipient1), tokenSelector('to'));
    I.fillField('CC', recipient2.get('primaryEmail'));
    I.waitForVisible('.focus .tt-dropdown-menu');
    I.pressKey('Enter');
    I.see(tokenLabelFor(recipient2), tokenSelector('cc'));
    I.fillField('BCC', recipient3.get('primaryEmail'));
    I.waitForVisible('.focus .tt-dropdown-menu');
    I.pressKey('Enter');
    I.see(tokenLabelFor(recipient3), tokenSelector('bcc'));

    // move around
    I.fillField('BCC', recipient4.get('primaryEmail'));
    I.waitForVisible('.focus .tt-dropdown-menu');
    I.pressKey('Enter');
    I.see(tokenLabelFor(recipient4), tokenSelector('bcc'));
    I.dragAndDrop(dragTarget(recipient4), dropTarget('cc'));
    I.dontSee(tokenLabelFor(recipient4), tokenSelector('bcc'));
    I.see(tokenLabelFor(recipient4), tokenSelector('cc'));
    I.dragAndDrop(dragTarget(recipient4), dropTarget('bcc'));
    I.dontSee(tokenLabelFor(recipient4), tokenSelector('cc'));
    I.see(tokenLabelFor(recipient4), tokenSelector('bcc'));
    I.dragAndDrop(dragTarget(recipient4), dropTarget('to'));
    I.see(tokenLabelFor(recipient4), tokenSelector('to'));
    I.see(tokenLabelFor(recipient4), { css: '[data-extension-id="to"] .token:nth-of-type(4)' });
    I.see(tokenLabelFor(recipient1), { css: '[data-extension-id="to"] .token:nth-of-type(3)' });

    // drag to first position in field
    I.dragAndDrop({ css: '[data-extension-id="to"] .token:nth-of-type(4)' }, { css: '[data-extension-id="to"] .token:nth-of-type(3)' });
    I.see(tokenLabelFor(recipient4), { css: '[data-extension-id="to"] .token:nth-of-type(3)' });
    I.see(tokenLabelFor(recipient1), { css: '[data-extension-id="to"] .token:nth-of-type(4)' });

    // send the mail
    mail.send();

    // open detail view of sent mail
    I.selectFolder('Sent');
    mail.selectMail(mailSubject);

    // check recipients
    I.click('.show-all-recipients');
    I.see(tokenLabelFor(recipient1), '.person-to');
    I.see(tokenLabelFor(recipient4), '.person-to');
    I.see(tokenLabelFor(recipient2), '.person-cc');
    I.see(tokenLabelFor(recipient3), '.person-bcc');
});
