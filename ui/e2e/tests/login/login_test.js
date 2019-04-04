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

Feature('Login');

Before(async (users) => {
    await users.create();
});

After(async (users) => {
    await users.removeAll();
});

Scenario('[C7336] Successful Login', function (I, users) {
    I.amOnPage('/');
    I.wait(1);
    I.fillField('User name', `${users[0].get('name')}@${users[0].context.id}`);
    I.fillField('Password', users[0].get('password'));
    I.click('Sign in');
    I.waitForText('No message selected');
});