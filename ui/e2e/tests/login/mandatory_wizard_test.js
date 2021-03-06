/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2019 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Maik Schäfer <maik.schaefer@open-xchange.com>
 *
 */

/// <reference path="../../steps.d.ts" />

Feature('General > Mandatory Wizard');

Before(async (users) => {
    await users.create();
});

After(async (users) => {
    await users.removeAll();
});

Scenario('[C7341] Use first run mandatory wizard', async function (I, users) {
    const [user] = users;
    const first_name = 'John';
    const last_name = 'Wayne';
    await user.hasCapability('mandatory_wizard');

    I.amOnPage('/');
    I.wait(1);
    I.waitForInvisible('#background-loader.busy', 30);
    // make sure we have an english UI
    I.click('.dropdown');
    I.waitForText('English (United States)');
    I.click('English (United States)');
    I.fillField('User name', `${user.get('name')}@${user.context.id}`);
    I.fillField('Password', user.get('password'));
    I.click('Sign in');
    I.waitForInvisible('#background-loader.busy', 20);
    I.waitForText('Welcome to OX App Suite');
    I.click('Start tour');
    I.waitForFocus('.form-control');
    I.fillField('first_name', first_name);
    I.fillField('last_name', last_name);
    I.pressKey('Enter');
    I.click('Next');
    let listenerID = I.registerNodeRemovalListener('.wizard-container');
    I.click('Finish');
    I.waitForNodeRemoval(listenerID);
    I.waitForVisible('#io-ox-launcher', 5);
    I.waitForVisible('.contact-picture');
    I.wait(1);
    I.click('.contact-picture');
    I.waitForText('My contact data');
    I.click('My contact data');
    I.waitForText('My contact data');
    I.seeInField('first_name', first_name);
    I.seeInField('last_name', last_name);
});
