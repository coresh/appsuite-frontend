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
    'output': './build/e2e/',
    'helpers': {
        'WebDriverIO': _.extend({}, {
            'url': process.env.LAUNCH_URL || 'http://localhost:8337/appsuite/',
            'host': process.env.SELENIUM_HOST || '10.50.0.94',
            'smartWait': 1000,
            'waitForTimeout': 30000,
            'browser': 'chrome',
            'restart': false,
            'windowSize': 'maximize',
            'desiredCapabilities': {
                'browserName': 'chrome',
                'chromeOptions': {
                    'args': ['no-sandbox', 'start-maximized']
                },
                'acceptSslCerts': true
            }
        }, localConf.e2e.helpers.WebDriverIO || {}),
        OpenXchange: {
            require: './e2e/helper',
            users: localConf.e2e.users || [{
                username: 'tthamm',
                password: 'secret',
                mail: 'tthamm@ox-e2e-backend.novalocal'
            }]
        }
    },
    'include': {
        'I': './e2e/actor'
    },
    'bootstrap': function (done) {
        var chai = require('chai');
        chai.config.includeStack = true;

        var config = require('codeceptjs').config.get();
        if (/127\.0\.0\.1/.test(config.helpers.WebDriverIO.host)) {
            require('@open-xchange/codecept-helper').selenium
                .start(localConf.e2e.selenium)
                .then(done);
        } else {
            done();
        }
    },
    'teardown': function () {
        //HACK: defer killing selenium, because it's still needed for a few ms
        setTimeout(function () {
            require('@open-xchange/codecept-helper').selenium.stop();
        }, 500);
    },
    'mocha': {},
    'name': 'App Suite Core UI'
};