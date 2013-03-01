/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2013
 * Mail: info@open-xchange.com
 *
 * @author Daniel Dickhaus <daniel.dickhaus@open-xchange.com>
 */

define('io.ox/core/pubsub/publications', ['gettext!io.ox/core/pubsub',
                                          'io.ox/core/pubsub/model',
                                          'io.ox/core/extensions',
                                          'io.ox/backbone/forms',
                                          'io.ox/core/api/pubsub',
                                          'io.ox/core/api/templating',
                                          'io.ox/core/tk/dialogs'], function (gt, pubsub, ext, forms, api, templApi, dialogs)  {
    
    'use strict';
    
    var buildSubscribeDialog = function (baton) {
        //prepare data
        
        api.publicationTargets.getAll().done(function (data) {
            var target = '';
            _(data).each(function (obj) {
                if (obj.module === baton.data.module)   {
                    target = obj.id;
                }
            });
            var attr = {entity: {folder: baton.data.id},
                        entityModule: baton.data.module,
                        target: target};
            attr[target] = {'protected': true,
                            siteName: '',
                            template: '',
                            url: ''};
            
            //buildModel
            var model = new pubsub.Publication(attr);
            //buildView
            var view = new PublicationView({ model: model});
            
            view.render();
        });
    },
    PublicationView = Backbone.View.extend({
        tagName: "div",
        _modelBinder: undefined,
        initialize: function (options) {
            // create template
            this._modelBinder = new Backbone.ModelBinder();
        },
        render: function () {
            var self = this;
            //build popup
            var popup = new dialogs.ModalDialog()
                .addPrimaryButton('publish', gt('Publish'))
                .addButton('cancel', gt('Cancel'));
            
            //Header
            if (self.model.attributes.entity.folder) {
                popup.getHeader().append($('<h4>').text(gt('Publish folder')));
            } else {
                popup.getHeader().append($('<h4>').text(gt('Publish item')));
            }
            
            
            templApi.getNames().done(function (data) {//get the templates
                var baton = ext.Baton({ view: self, model: self.model, data: self.model.attributes, templates: data, target: self.model.attributes[self.model.attributes.target]});
                 //Body
                popup.getBody().addClass('form-horizontal');
                ext.point('io.ox/core/pubsub/publications/dialog').invoke('draw', popup.getBody(), baton);
                //go
                popup.show().done(function (action) {
                    console.log(action);
                    console.log(self);
                    if (action === 'publish') {
                        self.model.save().done(function () {
                        });
                    }
                });
            });

        }
    });
    
    ext.point('io.ox/core/pubsub/publications/dialog').extend({
        id: 'siteName',
        index: 100,
        draw: function (baton) {
            var node;
            this.append($('<div>').addClass('control-group').append(
                            $('<label>').addClass('siteName-label control-label').text(gt('Name')).attr('for', 'siteName-value'),
                            $('<div>').addClass('controls').append(
                                node = $('<input>').attr({type: 'text', id: 'siteName-value'}).addClass('siteName-value').on('change', function () {
                                    baton.target.siteName = node.val();
                                }))));
            //prefill
            node.val(baton.target.siteName);
        }
    });
    
    function buildTemplates(node, list) {
        for (var i = 0; i < list.length; i++) {
            $('<option>').text(list[i]).val(list[i]).appendTo(node);
        }
    }
    
    ext.point('io.ox/core/pubsub/publications/dialog').extend({
        id: 'template',
        index: 200,
        draw: function (baton) {
            var templates = [],
                node;
            for (var i = 0; i < baton.templates.length; i++) {
                if (baton.templates[i].indexOf(baton.data.entityModule) === 0) {
                    templates.push(baton.templates[i]);
                }
            }
            if (templates.length === 1) {
                node = $('<div>').val(templates[0]);
            } else {
                this.append($('<div>').addClass('control-group').append(
                    $('<label>').addClass('template-label control-label').attr('for', 'template-value').text(gt('Template')),
                    $('<div>').addClass('controls').append(
                        node = $('<select>').attr('id', 'template-value').addClass('template-value').on('change', function () {
                            baton.target.template = node.val();
                        }))));
                buildTemplates(node, templates);
            }
            
            //prefill
            if (baton.target.template === '') {//set to first item in selection
                baton.target.template = node.val();
            } else {
                node.val(baton.target.template);
            }
        }
    });
    
    ext.point('io.ox/core/pubsub/publications/dialog').extend({
        id: 'cypher',
        index: 300,
        draw: function (baton) {
            var node;
            this.append($('<div>').addClass('control-group').append(
                    $('<div>').addClass('controls').append(
                            $('<label>').addClass('checkbox').text(gt('Add cipher code')).append(
                            node = $('<input>').attr('type', 'checkbox').addClass('cypher-checkbox').on('change', function () {
                                if (node.attr('checked') === 'checked') {
                                    baton.target['protected'] = true;
                                } else {
                                    baton.target['protected'] = false;
                                }
                            }))))
                    );
            if (baton.target['protected'] === true) {
                node.attr('checked', 'checked');
            } else {
                node.attr('checked', 'unchecked');
            }
        }
    });
    
    ext.point('io.ox/core/pubsub/publications/dialog').extend({
        id: 'emailbutton',
        index: 400,
        draw: function (baton) {
            this.append($('<div>').addClass('control-group').append(
                        $('<div>').addClass('controls').append(
                        $('<button>').addClass('email-btn btn').text(gt('Send E-mail about this publication')).on('click', function () {
                            console.log('Hier koennte ihre Werbung stehen.');
                        }))),
                        $('<br>'));
        }
    });
    
    ext.point('io.ox/core/pubsub/publications/dialog').extend({
        id: 'legalinformation',
        index: 500,
        draw: function (baton) {
            var fullNode = $('<div>').append($('<b>').addClass('warning-label').text(gt('Attention')),
                        $('<div>').addClass('warning-text').text(
                            gt('The published data will be accessible to everyone on the Internet. Please consider, which data you want to publish.')),
                        $('<br>'),
                        $('<b>').addClass('privacy-label').text(gt('Privacy Notice')),
                        $('<div>').addClass('privacy-text').text(
                            gt('When using this publish feature, you as the current owner of the data are responsible for being careful with privacy rules and for complying with legal obligations (Copyright, Privacy Laws). ' +
                               'Especially when publishing personal data you are the responsible party according to the Federal Data Protection Act (BDSG, Germany) or other Privacy Acts of your country. ' +
                               'According to European and other national regulations you as the responsible party are in charge of data economy, and must not publish or forward personal data without the person\'s consent. ' +
                               'Beyond legal obligations, we would like to encourage extreme care when dealing with personal data. Please consider carefully where you store and to whom you forward personal data. Please ensure appropriate access protection, e.g. by proper password protection.')));
            
            var link = $('<div>').addClass('control-group').append($('<a>').addClass('controls').text(gt('Legal information')).on('click', function (e) {
                    e.preventDefault();
                    link.replaceWith(fullNode);
                }));
            this.append(link);
        }
    });
    
    return {
        buildSubscribeDialog: buildSubscribeDialog
    };
});