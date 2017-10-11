var fs = require('fs');
var _ = require('underscore');
var localConf = {};

if (fs.existsSync('grunt/local.conf.json')) {
    localConf = JSON.parse(fs.readFileSync('grunt/local.conf.json')) || {};
}
localConf.e2e = localConf.e2e || {};
localConf.e2e.helpers = localConf.e2e.helpers || {};

module.exports.config = {
    'tests': './e2e/tests/**/*_test.js',
    'timeout': 10000,
    'smartwait': 10000,
    'output': './build/e2e/',
    'helpers': {
        'WebDriverIO': _.extend({}, {
            'url': process.env.LAUNCH_URL || 'http://localhost:8337/appsuite/',
            'host': process.env.SELENIUM_HOST || '10.50.0.94',
            'smartWait': 5000,
            'browser': 'chrome',
            'restart': false,
            'windowSize': 'maximize',
            'timeouts': {
                'script': 60000,
                'page load': 10000
            },
            'desiredCapabilities': {
                'browserName': 'chrome',
                'chromeOptions': {
                    'args': ['no-sandbox', 'start-maximized']
                },
                'acceptSslCerts': true
            }
        }, localConf.e2e.helpers.WebDriverIO || {})
    },
    'include': {
        'I': './e2e/commands.js'
    },
    'bootstrap': function () {
        var users = localConf.e2e.users || [];
        if (users.length === 0) throw Object({ message: 'Please define at least one user in e2e.users.' });
        global.users = users;

        var chai = require('chai');
        chai.config.includeStack = true;
        global.expect = chai.expect;
        global.AssertionError = chai.AssertionError;
        global.Assertion = chai.Assertion;
        global.assert = chai.assert;
        chai.Should();
    },
    'mocha': {},
    'name': 'App Suite Core UI'
};