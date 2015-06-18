/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2011 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Christoph Kopp <christoph.kopp@open-xchange.com>
 */

define('io.ox/mail/mailfilter/settings/filter/view-form', [
    'io.ox/core/notifications',
    'gettext!io.ox/settings/settings',
    'io.ox/core/extensions',
    'io.ox/mail/mailfilter/settings/filter/form-elements',
    'io.ox/mail/mailfilter/settings/filter/defaults',
    'io.ox/backbone/mini-views',
    'io.ox/core/folder/picker',
    'io.ox/backbone/mini-views/datepicker'
], function (notifications, gt, ext, elements, DEFAULTS, mini, picker, DatePicker) {

    'use strict';

    var POINT = 'io.ox/mailfilter/settings/filter/detail',
        testCapabilities = {},

        sizeValues = {
            'over': gt('Is bigger than'),
            'under': gt('Is smaller than')
        },

        flagValues = {
            '\\deleted': gt('deleted'),
            '\\seen': gt('seen')
        },

        containsValues = {
            'contains': gt('Contains'),
            'is': gt('Is exactly'),
            'matches': gt('Matches'),
            //needs no different translation
            'regex': gt('Regex')
        },

        timeValues = {
            'ge': gt('starts on'),
            'le': gt('ends on'),
            'is': gt('is on')
        },

        headerTranslation = {
            'From': gt('Sender/From'),
            'any': gt('Any recipient'),
            'Subject': gt('Subject'),
            'mailingList': gt('Mailing list'),
            'To': gt('To'),
            'Cc': gt('CC'),
            'cleanHeader': gt('Header'),
            'envelope': gt('Envelope'),
            'size': gt('Size (bytes)'),
            'body': gt('Content'),
            'currentdate': gt('Current Date')
        },

        conditionsMapping = {
            'header': ['From', 'any', 'Subject', 'mailingList', 'To', 'Cc', 'cleanHeader'],
            'envelope': ['envelope'],
            'size': ['size'],
            'body': ['body']
        },

        actionsTranslations = {
            'keep': gt('Keep'),
            'discard': gt('Discard'),
            'redirect': gt('Redirect to'),
            'move': gt('Move to folder'),
            'reject': gt('Reject with reason'),
            'markmail': gt('Mark mail as'),
            'tag': gt('Tag mail with'),
            'flag': gt('Flag mail with')
        },

        actionCapabilities = {
            'keep': 'keep',
            'discard': 'discard',
            'redirect': 'redirect',
            'move': 'move',
            'reject': 'reject',
            'markmail': 'addflags',
            'tag': 'addflags',
            'flag': 'addflags'
        },

        COLORS = {
            NONE: { value: 0, text: gt('None') },
            RED: { value: 1, text: gt('Red') },
            ORANGE: { value: 7, text: gt('Orange') },
            YELLOW: { value: 10, text: gt('Yellow') },
            LIGHTGREEN: { value: 6, text: gt('Light green') },
            GREEN: { value: 3, text: gt('Green') },
            LIGHTBLUE: { value: 9, text: gt('Light blue') },
            BLUE: { value: 2, text: gt('Blue') },
            PURPLE: { value: 5, text: gt('Purple') },
            PINK: { value: 8, text: gt('Pink') },
            GRAY: { value: 4, text: gt('Gray') }
        },

        COLORFLAGS = {
            '$cl_1': '1',
            '$cl_2': '2',
            '$cl_3': '3',
            '$cl_4': '4',
            '$cl_5': '5',
            '$cl_6': '6',
            '$cl_7': '7',
            '$cl_8': '8',
            '$cl_9': '9',
            '$cl_10': '10'
        },
        currentState = null,

        checkForMultipleTests = function (el) {
            return $(el).find('[data-test-id]');
        },

        setFocus = function (el, type) {
            var listelement = $(el).find('[data-' + type + '-id]').last();
            if (type === 'test') listelement.find('input[tabindex="1"]').first().focus();

            if (type === 'action') listelement.find('[tabindex="1"]').first().focus();
        },

        renderWarningForEmptyTests = function (node) {
            var warning = $('<div>').addClass('alert alert-info').text(gt('This rule applies to all messages. Please add a condition to restrict this rule to specific messages.'));
            node.append(warning);
        },

        prepareFolderForDisplay = function (folder) {
            var arrayOfParts = folder.split('/');
            arrayOfParts.shift();
            return arrayOfParts.join('/');
        },

        toggleSaveButton = function (footer, pane) {
            if (pane.find('input.warning').length === 0) {
                footer.find('[data-action="save"]').prop('disabled', false);
            } else {
                footer.find('[data-action="save"]').prop('disabled', true);
            }
        },

        filterValues = function (testType, possibleValues) {
            var availableValues = {};
            _.each(possibleValues, function (value, key) {
                if (_.indexOf(testCapabilities[testType], key) !== -1) availableValues[key] = value;
            });
            return availableValues;
        },

        FilterDetailView = Backbone.View.extend({
            tagName: 'div',
            className: 'io-ox-mailfilter-edit',

            initialize: function (opt) {

                _.each(opt.config.tests, function (value) {
                    testCapabilities[value.test] = value.comparison;
                });

                var unsupported = [];
                _.each(actionCapabilities, function (val, key) {
                    var index = _.indexOf(opt.config.actioncommands, val);
                    if (index === -1) {
                        unsupported.push(key);
                    }
                });
                actionsTranslations = _.omit(actionsTranslations, unsupported);

                _.each(conditionsMapping, function (list, conditionGroup) {
                    if (!_.has(testCapabilities, conditionGroup)) {
                        _.each(conditionsMapping[conditionGroup], function (condition) {
                            delete headerTranslation[condition] ;
                        });
                    }
                });

                this.listView = opt.listView;
            },

            render: function () {

                var baton = ext.Baton({ model: this.model, view: this });
                ext.point(POINT + '/view').invoke('draw', this.$el.empty(), baton);
                toggleSaveButton(this.dialog.getFooter(), this.$el);
                return this;

            },
            events: {
                'save': 'onSave',
                'click [data-action="change-value"]': 'onChangeValue',

                'click [data-action=change-value-extern]': 'onChangeValueExtern',

                'click [data-action="change-value-actions"]': 'onChangeValueAction',
                'change [data-action="change-text-test"]': 'onChangeTextTest',
                'keyup [data-action="change-text-test"]': 'onKeyupTextTest',
                'change [data-action="change-text-test-second"]': 'onChangeTextTestSecond',

                'change [data-action="change-text-action"]': 'onChangeTextAction',
                'click .folderselect': 'onFolderSelect',
                'click [data-action="change-color"]': 'onChangeColor',
                'click [data-action="remove-test"]': 'onRemoveTest',
                'click [data-action="remove-action"]': 'onRemoveAction'
            },

            onRemoveTest: function (e) {

                e.preventDefault();
                var node = $(e.target),
                    testID = node.closest('li').attr('data-test-id'),
                    testArray =  this.model.get('test');

                if (checkForMultipleTests(this.el).length > 2) {
                    testArray.tests.splice(testID, 1);
                } else {

                    if (testArray.tests) {
                        testArray.tests.splice(testID, 1);
                        testArray = testArray.tests[0];
                    } else {
                        testArray = { id: 'true' };
                    }

                }

                this.model.set('test', testArray);
                this.render();
            },

            onRemoveAction: function (e) {

                e.preventDefault();
                var node = $(e.target),
                    actionID = node.closest('li').attr('data-action-id'),
                    actionArray =  this.model.get('actioncmds');

                actionArray.splice(actionID, 1);
                this.model.set('actioncmds', actionArray);
                this.render();

            },

            onSave: function () {
                var self = this,
                    // rulePosition,
                    testsPart = this.model.get('test'),
                    actionArray = this.model.get('actioncmds'),
                    config = {
                        'header': ['headers', 'values'],
                        'envelope': ['headers', 'values'],
                        'size': ['size']
                    };

                if (currentState !== null) self.model.trigger('ChangeProcessSub', currentState);
                currentState = null;

                function loopAndRemove(testsArray) {
                    var idArray = [];
                    _.each(testsArray, function (single) {
                        var valueIds = config[single.id],
                            sum = _.reduce(valueIds, function (memo, val) {
                                var value = _.isArray(single[val]) ? single[val][0] : single[val];
                                return value.toString().trim() === '' ? false : memo;
                            }, true);
                        if (sum) {
                            idArray.push(single);
                        }
                    });
                    return idArray;
                }

                function returnKeyForStop(actionsArray) {
                    var indicatorKey;
                    _.each(actionsArray, function (action, key) {
                        if (_.isEqual(action, { id: 'stop' })) {
                            indicatorKey = key;
                        }
                    });
                    return indicatorKey;
                }

                // if (!this.model.has('id')) {
                //     rulePosition = adjustRulePosition(self.options.listView.collection.models);
                //     if (rulePosition !== undefined) {
                //         this.model.set('position', rulePosition);
                //     }
                // }

                if (testsPart.tests) {
                    testsPart.tests = loopAndRemove(testsPart.tests);
                    if (testsPart.tests.length === 0) {
                        this.model.set('test', { id: 'true' });
                    } else {
                        this.model.set('test', testsPart);
                    }
                } else {
                    if (testsPart.id === 'header' && testsPart.values[0].trim() === '') {
                        this.model.set('test', { id: 'true' });
                    }
                    if (testsPart.id === 'size' && testsPart.size.toString().trim() === '') {
                        this.model.set('test', { id: 'true' });
                    }
                }

                // if there is a stop action it should always be the last
                if (returnKeyForStop(actionArray) !== undefined) {
                    actionArray.splice(returnKeyForStop(actionArray), 1);
                    actionArray.push({ id: 'stop' });
                    this.model.set('actioncmds', actionArray);
                }

                this.model.save().then(function (id) {
                    //first rule gets 0
                    if (!_.isUndefined(id) && !_.isNull(id)) {
                        self.model.set('id', id);
                        self.listView.collection.add(self.model);
                    }
                    self.dialog.close();
                }, self.dialog.idle);
            },

            onChangeValueExtern: function (e) {
                e.preventDefault();
                var node = $(e.target),
                    data = node.data(),
                    valueType = data.test ? 'test' : 'action';
                if (data.target) {
                    var arrayOfTests = this.model.get('test');
                    arrayOfTests.id = data.value;
                    this.model.set('test', arrayOfTests);
                } else if (data.test === 'create') {

                    var testArray =  this.model.get('test');
                    if (checkForMultipleTests(this.el).length > 1) {
                        testArray.tests.push(_.copy(DEFAULTS.tests[data.value], true));

                    } else if (checkForMultipleTests(this.el).length === 1) {
                        var createdArray = [testArray];
                        createdArray.push(_.copy(DEFAULTS.tests[data.value], true));
                        testArray = { id: 'allof' };
                        testArray.tests = createdArray;
                    } else {

                        testArray = _.copy(DEFAULTS.tests[data.value], true);
                    }

                    this.model.set('test', testArray);
                    this.dialog.getFooter().find('[data-action="save"]').prop('disabled', true);
                } else if (data.action === 'create') {
                    var actionArray = this.model.get('actioncmds');
                    actionArray.push(_.copy(DEFAULTS.actions[data.value], true));

                    this.model.set('actioncmds', actionArray);
                }
                this.render();

                setFocus(this.el, valueType);
            },

            onChangeValue: function (e) {
                e.preventDefault();
                var node = $(e.target),
                    value = node.attr('data-value') ? node.attr('data-value') : node.parent().attr('data-value'),
                    link = node.closest('.action').find('a.dropdown-toggle'),
                    list = link.closest('li'),
                    label =  list.find('label.sr-only'),
                    testTitle = list.find('.list-title').text(),
                    testID = list.attr('data-test-id'),

                    testArray =  this.model.get('test'),
                    translatedValue;

                switch (list.attr('data-type')) {
                    case 'size':
                        translatedValue = sizeValues[value];
                        break;
                    case 'values':
                        translatedValue = containsValues[value];
                        break;
                    case 'currentdate':
                        translatedValue = timeValues[value];
                }

                label.text(testTitle + ' ' + value);
                link.text(translatedValue);

                if (checkForMultipleTests(this.el).length > 1) {
                    testArray.tests[testID].comparison = value;
                } else {
                    testArray.comparison = value;
                }
                this.model.set('test', testArray);

                link.focus();
            },

            onChangeValueAction: function (e) {
                e.preventDefault();
                var node = $(e.target),
                    value = node.attr('data-value') ? node.attr('data-value') : node.parent().attr('data-value'),
                    link = node.closest('.action').find('a.dropdown-toggle'),
                    list = link.closest('li'),
                    actionID = list.attr('data-action-id'),
                    actionsArray =  this.model.get('actioncmds'),
                    translatedValue = flagValues[value];

                link.text(translatedValue);
                actionsArray[actionID].flags = [value];
                this.model.set('actioncmds', actionsArray);

                link.focus();
            },

            onChangeTextTest: function (e) {
                e.preventDefault();
                var node = $(e.target),
                    value = node.val(),
                    list = node.closest('li'),
                    type = list.attr('data-type'),
                    testID = list.attr('data-test-id'),
                    testArray =  this.model.get('test');
                if (checkForMultipleTests(this.el).length > 1) {
                    testArray.tests[testID][type] = type === 'size' ? value : [value];
                } else {
                    testArray[type] = type === 'size' ? value : [value];
                }
                this.model.set('test', testArray);

            },

            onKeyupTextTest: function (e) {
                e.preventDefault();
                toggleSaveButton(this.dialog.getFooter(), this.$el);
            },

            onChangeTextTestSecond: function (e) {
                e.preventDefault();
                var node = $(e.target),
                    value = node.val(),
                    list = node.closest('li'),
                    type = list.attr('data-type-second'),
                    testID = list.attr('data-test-id'),
                    testArray =  this.model.get('test');

                if (checkForMultipleTests(this.el).length > 1) {
                    testArray.tests[testID][type] = [value];
                } else {
                    testArray[type] = [value];
                }

                this.model.set('test', testArray);

            },

            onChangeTextAction: function (e) {

                function validateValue(value) {
                    var regex =  /\s/;
                    return regex.test(value);
                }

                e.preventDefault();
                var node = $(e.target),
                    value = node.val(),
                    list = node.closest('li'),
                    label =  list.find('label.sr-only'),
                    actionTitle = list.find('.list-title').text(),
                    type = list.attr('data-type'),
                    actionID = list.attr('data-action-id'),
                    actionArray =  this.model.get('actioncmds');

                label.text(actionTitle);

                if (type === 'flags') {

                    if (!validateValue(value)) {
                        actionArray[actionID][type] = ['$' + value.toString()];
                    } else {
                        notifications.yell('error', gt('The character " " is not allowed.'));
                    }

                } else {
                    actionArray[actionID][type] = type === 'to' || 'text' ? value : [value];
                }

                this.model.set('actioncmds', actionArray);

            },

            onFolderSelect: function (e) {

                e.preventDefault();

                var self = this,
                    list = $(e.currentTarget).closest('li'),
                    type = list.attr('data-type'),
                    actionID = list.attr('data-action-id'),
                    inputField = list.find('input'),
                    currentFolder =  this.model.get('actioncmds')[actionID].into,
                    actionArray =  this.model.get('actioncmds');

                this.dialog.getPopup().hide();

                picker({
                    context: 'filter',
                    done: function (id) {

                        var prepared = prepareFolderForDisplay(id);

                        actionArray[actionID][type] = id;
                        self.model.set('actioncmds', actionArray);

                        inputField.val(prepared);
                        inputField.attr('title', id);
                    },
                    close: function () {
                        self.dialog.getPopup().show();
                        self.$el.find('[data-action-id="' + actionID + '"] .folderselect').focus();
                    },
                    folder: currentFolder,
                    module: 'mail',
                    root: '1'
                });
            },

            onChangeColor: function (e) {
                e.preventDefault();
                var list = $(e.currentTarget).closest('li[data-action-id]'),
                    actionID = list.attr('data-action-id'),
                    colorValue = list.find('div.flag').attr('data-color-value'),
                    actionArray =  this.model.get('actioncmds');

                actionArray[actionID].flags[0] = '$cl_' + colorValue;
                this.model.set('actioncmds', actionArray);
                this.render();

                this.$el.find('[data-action-id="' + actionID + '"] .dropdown-toggle').focus();
            }

        });

    ext.point(POINT + '/view').extend({
        index: 150,
        id: 'tests',
        draw: function (baton) {

            var listTests = $('<ol class="widget-list list-unstyled tests">'),
                listActions = $('<ol class="widget-list list-unstyled actions">'),
                appliedTest = baton.model.get('test');

            if (appliedTest.tests) {
                appliedTest = appliedTest.tests;
            } else {
                appliedTest = [appliedTest];
            }

            _(appliedTest).each(function (test, num) {
                if (test.id === 'size') {
                    listTests.append(
                        $('<li>').addClass('filter-settings-view row').attr({ 'data-type': 'size', 'data-test-id': num }).append(
                            $('<div>').addClass('col-md-4 singleline').append(
                                $('<span>').addClass('list-title').text(headerTranslation[test.id])
                            ),
                            $('<div>').addClass('col-md-8').append(
                                $('<div>').addClass('row').append(
                                    $('<div>').addClass('col-md-4').append(
                                        elements.drawOptions(test.comparison, filterValues(test.id, sizeValues))
                                    ),
                                    $('<div class="col-md-8">').append(
                                        elements.drawInputfieldTest(test.comparison, test.size)
                                    )
                                )
                            ),
                            elements.drawDeleteButton('test')
                        )
                    );
                } else if (test.id === 'body') {
                    listTests.append(
                        $('<li>').addClass('filter-settings-view row').attr({ 'data-type': 'values', 'data-test-id': num }).append(
                            $('<div>').addClass('col-md-4 singleline').append(
                                $('<span>').addClass('list-title').text(headerTranslation[test.id])
                            ),
                            $('<div>').addClass('col-md-8').append(
                                $('<div>').addClass('row').append(
                                    $('<div>').addClass('col-md-4').append(
                                        elements.drawOptions(test.comparison, filterValues(test.id, containsValues))
                                    ),
                                    $('<div class="col-md-8">').append(
                                        elements.drawInputfieldTest(test.comparison, test.values[0])
                                    )
                                )
                            ),
                            elements.drawDeleteButton('test')
                        )
                    );
                } else if (test.id === 'currentdate') {
                    var TimeModel = Backbone.Model.extend({
                        }),
                        model = new TimeModel();

                    model.set('datevalue', test.datevalue);

                    model.on('change:datevalue', function () {
                        test.datevalue = [model.get('datevalue')];
                        if (test.datevalue[0] === null) {
                            listTests.find('[data-test-id="' + num + '"] input').addClass('warning');
                        } else {
                            listTests.find('[data-test-id="' + num + '"] input').removeClass('warning');
                        }

                        toggleSaveButton(baton.view.dialog.getFooter(), baton.view.$el);
                    });

                    listTests.append(
                        $('<li>').addClass('filter-settings-view row').attr({ 'data-type': 'currentdate', 'data-test-id': num }).append(
                            $('<div>').addClass('col-md-4 singleline').append(
                                $('<span>').addClass('list-title').text(headerTranslation[test.id])
                            ),
                            $('<div>').addClass('col-md-8').append(
                                $('<div>').addClass('row').append(
                                    $('<div>').addClass('col-md-4').append(
                                        elements.drawOptions(test.comparison, filterValues(test.id, timeValues))
                                    ),
                                    $('<div class="col-md-8">').append(
                                        new DatePicker({
                                            model: model,
                                            display: 'DATE',
                                            attribute: 'datevalue',
                                            label: gt('datepicker')
                                        }).render().$el
                                    )
                                )
                            ),
                            elements.drawDeleteButton('test')
                        )
                    );
                    listTests.find('fieldset legend').addClass('sr-only');
                    if (test.datevalue.length === 0) listTests.find('[data-test-id="' + num + '"] input').addClass('warning');

                } else if (test.id === 'header') {
                    var name;
                    if (test.headers[3]) {
                        name = headerTranslation.mailingList;
                    } else if (test.headers[1]) {
                        name = headerTranslation.any;
                    } else {
                        name = test.headers[0] === '' ? headerTranslation.cleanHeader : headerTranslation[test.headers[0]];
                    }

                    if (test.headers[0] === '' || name === undefined) {
                        name = headerTranslation.cleanHeader;
                        listTests.append(
                            $('<li>').addClass('filter-settings-view row').attr({ 'data-test-id': num, 'data-type': 'values', 'data-type-second': 'headers' }).append(
                                $('<div>').addClass('col-md-4 doubleline').append(
                                    $('<span>').addClass('list-title').text(name)
                                ),
                                $('<div>').addClass('col-md-8').append(
                                    $('<div>').addClass('row').append(
                                        elements.drawInputfieldTestSecond(test.headers[0], gt('Name'))
                                    ),
                                    $('<div>').addClass('row').append(
                                        $('<div>').addClass('col-md-4').append(
                                            elements.drawOptions(test.comparison, filterValues(test.id, containsValues))
                                        ),
                                        $('<div class="col-md-8">').append(
                                            elements.drawInputfieldTest(name + ' ' + test.comparison, test.values[0])
                                        )
                                    )
                                ),
                                elements.drawDeleteButton('test')
                            )
                        );
                    } else {
                        listTests.append(
                            $('<li>').addClass('filter-settings-view row').attr({ 'data-test-id': num, 'data-type': 'values' }).append(
                                $('<div>').addClass('col-md-4 singleline').append(
                                    $('<span>').addClass('list-title').text(name)
                                ),
                                $('<div>').addClass('col-md-8').append(
                                    $('<div>').addClass('row').append(
                                        $('<div>').addClass('col-md-4').append(
                                            elements.drawOptions(test.comparison, filterValues(test.id, containsValues))
                                        ),
                                        $('<div class="col-md-8">').append(
                                            elements.drawInputfieldTest(name + ' ' + test.comparison, test.values[0])
                                        )
                                    )
                                ),
                                elements.drawDeleteButton('test')
                            )
                        );
                    }

                } else if (test.id === 'envelope') {

                    listTests.append(
                        $('<li>').addClass('filter-settings-view row').attr({ 'data-type': 'values', 'data-test-id': num }).append(
                            $('<div>').addClass('col-md-4 singleline').append(
                                $('<span>').addClass('list-title').text(headerTranslation[test.id])
                            ),
                            $('<div>').addClass(' col-md-8').append(
                                $('<div>').addClass('row').append(
                                    $('<div>').addClass('col-md-4').append(
                                        elements.drawOptions(test.comparison, filterValues(test.id, containsValues))
                                    ),
                                    $('<div class="col-md-8">').append(
                                        elements.drawInputfieldTest(headerTranslation[test.id] + ' ' + test.comparison, test.values[0])
                                    )
                                )
                            ),
                            elements.drawDeleteButton('test')
                        )
                    );
                }
            });

            _(baton.model.get('actioncmds')).each(function (action, num) {
                if (action.id !== 'stop') {

                    if (action.id === 'redirect') {
                        listActions.append(
                            $('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': num, 'data-type': 'to' }).append(
                                $('<div>').addClass('col-md-4 singleline').append(
                                    $('<span>').addClass('list-title').text(actionsTranslations[action.id])
                                ),
                                $('<div>').addClass('col-md-8').append(
                                    $('<div>').addClass('row').append(
                                        $('<div>').addClass('col-md-8 col-md-offset-4').append(
                                            elements.drawInputfieldAction(actionsTranslations[action.id], action.to)
                                        )
                                    )
                                ),
                                elements.drawDeleteButton('action')
                            )
                        );
                    } else if (action.id === 'move') {
                        listActions.append(
                            $('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': num, 'data-type': 'into' }).append(
                                $('<div>').addClass('col-md-4 singleline').append(
                                    $('<span>').addClass('list-title').text(actionsTranslations[action.id])
                                ),
                                $('<div>').addClass(' col-md-8').append(
                                    $('<div>').addClass('row').append(
                                        $('<div>').addClass('col-md-4 rightalign').append(
                                            elements.drawFolderSelect()
                                        ),
                                        $('<div class="col-md-8">').append(
                                            elements.drawDisabledInputfield(actionsTranslations[action.id], prepareFolderForDisplay(action.into))
                                        )
                                    )
                                ),
                                elements.drawDeleteButton('action')
                            )
                        );
                    } else if (action.id === 'reject') {
                        listActions.append(
                            $('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': num, 'data-type': 'text' }).append(
                                $('<div>').addClass('col-md-4 singleline').append(
                                    $('<span>').addClass('list-title').text(actionsTranslations[action.id])
                                ),
                                $('<div>').addClass('col-md-8').append(
                                    $('<div>').addClass('row').append(
                                        $('<div>').addClass('col-md-8 col-md-offset-4').append(
                                            elements.drawInputfieldAction(actionsTranslations[action.id], action.text)
                                        )
                                    )
                                ),
                                elements.drawDeleteButton('action')
                        ));
                    } else if (action.id === 'addflags') {
                        if (/delete|seen/.test(action.flags[0])) {
                            listActions.append(
                                $('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': num, 'data-type': 'text' }).append(
                                    $('<div>').addClass('col-md-4 singleline').append(
                                        $('<span>').addClass('list-title').text(actionsTranslations.markmail)
                                    ),

                                    $('<div>').addClass('col-md-8').append(
                                        $('<div>').addClass('row').append(
                                            $('<div>').addClass('col-md-3 col-md-offset-9 rightalign').append(
                                                elements.drawOptionsActions(action.flags[0], flagValues, 'mark-as')
                                            )
                                        )
                                    ),
                                    elements.drawDeleteButton('action')
                                )
                            );
                        } else if (/^\$cl/.test(action.flags[0])) {
                            listActions.append($('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': num, 'data-type': 'text' }).append(
                                $('<div>').addClass('col-md-4 singleline').append(
                                    $('<span>').addClass('list-title').text(actionsTranslations.flag)
                                ),
                                $('<div>').addClass('col-md-8').append(
                                    $('<div>').addClass('row').append(
                                        $('<div>').addClass('col-md-3 col-md-offset-9 rightalign').append(
                                            elements.drawColorDropdown(action.flags[0], COLORS, COLORFLAGS)
                                        )
                                    )
                                ),
                                elements.drawDeleteButton('action')
                            ));
                        } else {
                            listActions.append(
                                $('<li>').addClass('filter-settings-view row').attr({ 'data-action-id': num, 'data-type': 'flags' }).append(
                                    $('<div>').addClass('col-md-4 singleline').append(
                                        $('<span>').addClass('list-title').text(actionsTranslations.tag)
                                    ),
                                    $('<div>').addClass('col-md-8').append(
                                        $('<div>').addClass('row').append(
                                            $('<div>').addClass('col-md-8 col-md-offset-4').append(
                                                elements.drawInputfieldAction(actionsTranslations.tag, action.flags[0].replace(/^\$+/, ''))
                                            )
                                        )
                                    ),
                                    elements.drawDeleteButton('action')
                                )
                            );
                        }
                    } else {
                        var classSet = action.id === 'discard' ? 'filter-settings-view warning' : 'filter-settings-view';
                        listActions.append(
                            $('<li>').addClass(classSet + ' row').attr('data-action-id', num).append(
                                $('<div>').addClass('col-md-4 singleline').append(
                                    $('<span>').addClass('list-title').text(actionsTranslations[action.id])
                                ),
                                elements.drawDeleteButton('action')
                            )
                        );
                    }

                }
            });

            var headlineTest = $('<legend>').addClass('sectiontitle expertmode conditions').text(gt('Conditions')),
                headlineActions = $('<legend>').addClass('sectiontitle expertmode actions').text(gt('Actions')),
                notification = $('<div>');

            if (_.isEqual(appliedTest[0], { id: 'true' })) {
                renderWarningForEmptyTests(notification);
            }

            this.append(
                headlineTest, notification, listTests,
                elements.drawOptionsExtern(gt('Add condition'), headerTranslation, {
                    test: 'create',
                    toggle: 'dropdown'
                }),
                headlineActions, listActions,
                elements.drawOptionsExtern(gt('Add action'), actionsTranslations, {
                    action: 'create',
                    toggle: 'dropup'
                })
            );

        }
    });

    ext.point(POINT + '/view').extend({
        id: 'rulename',
        index: 100,
        draw: function (baton) {
            this.append(
                $('<label for="rulename">').text(gt('Rule name')),
                new mini.InputView({ name: 'rulename', model: baton.model, className: 'form-control', id: 'rulename' }).render().$el
            );
        }
    });

    ext.point(POINT + '/view').extend({
        index: 100,
        id: 'appliesto',
        draw: function (baton) {
            var arrayOfTests = baton.model.get('test'),
                options = {
                    target: 'id',
                    toggle: 'dropup',
                    classes: 'no-positioning',
                    caret: true
                },
                optionsSwitch = elements.drawOptionsExtern(arrayOfTests.id, { allof: gt('Apply rule if all conditions are met'), anyof: gt('Apply rule if any condition is met.') }, options);
            if (arrayOfTests.id === 'allof' || arrayOfTests.id === 'anyof') {
                this.append($('<div>').addClass('line').append(optionsSwitch));
            } else {
                this.append($('<div>').addClass('line').text(gt('Apply rule if all conditions are met')));
            }

        }
    });

    ext.point(POINT + '/view').extend({
        index: 200,
        id: 'stopaction',
        draw: function (baton) {
            var checkStopAction = function (e) {
                currentState = $(e.currentTarget).find('[type="checkbox"]').prop('checked');
                var arrayOfActions = baton.model.get('actioncmds');

                function getCurrentPosition(array) {
                    var currentPosition;
                    _.each(array, function (single, id) {
                        if (single.id === 'stop') {
                            currentPosition = id;
                        }
                    });

                    return currentPosition;
                }

                if (currentState === true) {
                    arrayOfActions.splice(getCurrentPosition(arrayOfActions), 1);

                } else {
                    arrayOfActions.push({ id: 'stop' });
                }

                baton.model.set('actioncmds', arrayOfActions);

            },

            target = baton.view.dialog.getFooter(),
            arrayOfActions = baton.model.get('actioncmds');

            function checkForStopAction(array) {
                var stopAction;
                if (baton.model.id === undefined) {
                    // default value
                    return true;
                }

                _.each(array, function (single) {
                    if (single.id === 'stop') {
                        stopAction = false;
                    }

                });
                if (stopAction === undefined) {
                    return true;
                }
                return stopAction;
            }

            if (!target.find('[type="checkbox"]').length) {
                target.append(elements.drawcheckbox(checkForStopAction(arrayOfActions)).on('change', checkStopAction));
            }

        }
    });

    return FilterDetailView;

});
