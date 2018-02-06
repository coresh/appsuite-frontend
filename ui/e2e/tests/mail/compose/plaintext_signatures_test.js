/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 * © 2017 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Richard Petersen <richard.petersen@open-xchange.com>
 */
/// <reference path="../../../steps.d.ts" />

const expect = require('chai').expect;

Feature('Mail compose: Plaintext signatures');

const signatures = [
    'The content of the first signature',
    'The content of the second signature',
    'The content of the third signature',
    'The content of the fourth signature'
];

function* selectAndAssertSignature(I, name, compare) {
    I.click('Signatures');
    I.click(name);
    let result = yield I.grabValueFrom('.io-ox-mail-compose textarea.plain-text');
    if (compare instanceof RegExp) expect(result).to.match(compare);
    else expect(result).to.equal(compare);
}

Scenario('compose new mail with signature above correctly placed and changed', function* (I) {
    I.login('app=io.ox/mail', { prefix: 'io.ox/mail/signatures' });
    I.waitForVisible('.io-ox-mail-window');
    I.setSetting('io.ox/mail', 'defaultSignature', '0');
    I.setSetting('io.ox/mail', 'messageFormat', 'text');

    I.clickToolbar('Compose');
    I.waitForVisible('.io-ox-mail-compose textarea.plain-text');
    I.wait(1);
    expect(yield I.grabValueFrom('.io-ox-mail-compose textarea.plain-text')).to.equal(`\n\n${signatures[0]}`);

    yield* selectAndAssertSignature(I, 'Second signature above', `\n\n${signatures[1]}`);
    yield* selectAndAssertSignature(I, 'First signature below', `\n\n${signatures[2]}`);
    yield* selectAndAssertSignature(I, 'Second signature below', `\n\n${signatures[3]}`);
    yield* selectAndAssertSignature(I, 'No signature', '');
    yield* selectAndAssertSignature(I, 'First signature above', `\n\n${signatures[0]}`);

    // insert some text
    I.click('.io-ox-mail-compose textarea.plain-text');
    I.pressKey(['Up arrow', 'Up arrow', 'some user input']);
    expect(yield I.grabValueFrom('.io-ox-mail-compose textarea.plain-text')).to.equal(`some user input\n\n${signatures[0]}`);

    yield* selectAndAssertSignature(I, 'Second signature above', `some user input\n\n${signatures[1]}`);
    yield* selectAndAssertSignature(I, 'First signature below', `some user input\n\n${signatures[2]}`);
    yield* selectAndAssertSignature(I, 'Second signature below', `some user input\n\n${signatures[3]}`);
    yield* selectAndAssertSignature(I, 'No signature', 'some user input');
    yield* selectAndAssertSignature(I, 'First signature above', `some user input\n\n${signatures[0]}`);

    // discard mail
    I.click('Discard');
    I.click('Discard message');
    I.waitForVisible('.io-ox-mail-window');

    I.logout();
});

Scenario('compose new mail with signature below correctly placed initially', function* (I) {
    I.login('app=io.ox/mail', { prefix: 'io.ox/mail/signatures' });
    I.waitForVisible('.io-ox-mail-window');
    I.setSetting('io.ox/mail', 'defaultSignature', '2');
    I.setSetting('io.ox/mail', 'messageFormat', 'text');

    I.clickToolbar('Compose');
    I.waitForVisible('.io-ox-mail-compose textarea.plain-text');
    I.wait(1);
    expect(yield I.grabValueFrom('.io-ox-mail-compose textarea.plain-text')).to.equal(`\n\n${signatures[2]}`);

    // discard mail
    I.click('Discard');
    I.click('Discard message');
    I.waitForVisible('.io-ox-mail-window');

    I.logout();
});

Scenario('Reply to mail with signature above correctly placed and changed', function* (I) {
    I.login('app=io.ox/mail', { prefix: 'io.ox/mail/signatures' });
    I.waitForVisible('.io-ox-mail-window');
    I.setSetting('io.ox/mail', 'defaultReplyForwardSignature', '0');
    I.setSetting('io.ox/mail', 'messageFormat', 'text');

    // click on first email
    I.click('.io-ox-mail-window .leftside ul li.list-item');
    I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject');
    expect(yield I.grabTextFrom('.io-ox-mail-window .mail-detail-pane .subject')).to.equal('Test subject');

    // reply to that mail
    I.click('.io-ox-mail-window .window-content a[data-action="more"]');
    I.click('Reply');
    I.waitForVisible('.io-ox-mail-compose textarea.plain-text');
    I.wait(1);
    expect(yield I.grabValueFrom('.io-ox-mail-compose textarea.plain-text')).to.match(
        new RegExp(`^\\n\\n${signatures[0]}\\n\\n(>[^\\n]*(\\n)?)+$`)
    );

    yield* selectAndAssertSignature(I, 'Second signature above', new RegExp(`^\\n\\n${signatures[1]}\\n\\n(>[^\\n]*(\\n)?)+$`));
    yield* selectAndAssertSignature(I, 'First signature below', new RegExp(`^\\n\\n(>[^\\n]*(\\n)?)+\\n\\n${signatures[2]}$`));
    yield* selectAndAssertSignature(I, 'Second signature below', new RegExp(`^\\n\\n(>[^\\n]*(\\n)?)+\\n\\n${signatures[3]}$`));
    yield* selectAndAssertSignature(I, 'No signature', /^\n\n(>[^\n]*(\n)?)+$/);
    yield* selectAndAssertSignature(I, 'First signature above', new RegExp(`^\\n\\n${signatures[0]}\\n\\n(>[^\\n]*(\\n)?)+$`));

    // insert some text at the very beginning
    I.click('.io-ox-mail-compose textarea.plain-text');
    I.pressKey(['PageUp', 'some user input']);
    expect(yield I.grabValueFrom('.io-ox-mail-compose textarea.plain-text')).to.match(
        new RegExp(`^some user input\\n\\n${signatures[0]}\\n\\n(>[^\\n]*(\\n)?)+$`)
    );

    yield* selectAndAssertSignature(I, 'Second signature above', new RegExp(`^some user input\\n\\n${signatures[1]}\\n\\n(>[^\\n]*(\\n)?)+$`));
    yield* selectAndAssertSignature(I, 'First signature below', new RegExp(`^some user input\\n\\n(>[^\\n]*(\\n)?)+\\n\\n${signatures[2]}$`));
    yield* selectAndAssertSignature(I, 'Second signature below', new RegExp(`^some user input\\n\\n(>[^\\n]*(\\n)?)+\\n\\n${signatures[3]}$`));
    yield* selectAndAssertSignature(I, 'No signature', /^some user input\n\n(>[^\n]*(\n)?)+$/);
    yield* selectAndAssertSignature(I, 'First signature above', new RegExp(`^some user input\\n\\n${signatures[0]}\\n\\n(>[^\\n]*(\\n)?)+$`));

    // discard mail
    I.click('Discard');
    I.click('Discard message');
    I.waitForVisible('.io-ox-mail-window');

    I.logout();
});

Scenario('reply to mail with signature below correctly placed initially', function* (I) {
    I.login('app=io.ox/mail', { prefix: 'io.ox/mail/signatures' });
    I.waitForVisible('.io-ox-mail-window');
    I.setSetting('io.ox/mail', 'defaultReplyForwardSignature', '2');
    I.setSetting('io.ox/mail', 'messageFormat', 'text');

    // click on first email
    I.click('.io-ox-mail-window .leftside ul li.list-item');
    I.waitForVisible('.io-ox-mail-window .mail-detail-pane .subject');
    expect(yield I.grabTextFrom('.io-ox-mail-window .mail-detail-pane .subject')).to.equal('Test subject');

    // reply to that mail
    I.click('.io-ox-mail-window .window-content a[data-action="more"]');
    I.click('Reply');
    I.waitForVisible('.io-ox-mail-compose textarea.plain-text');
    I.wait(1);
    expect(yield I.grabValueFrom('.io-ox-mail-compose textarea.plain-text')).to.match(
        new RegExp(`^\\n\\n(>[^\\n]*(\\n)?)+\\n\\n${signatures[2]}$`)
    );

    // discard mail
    I.click('Discard');
    I.click('Discard message');
    I.waitForVisible('.io-ox-mail-window');

    I.logout();
});