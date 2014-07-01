/* jshint unused: false */
/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2014 Open-Xchange Inc., Tarrytown, NY, USA. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/mail/compose/extensions',
    ['io.ox/mail/sender',
     'io.ox/backbone/mini-views/dropdown',
     'io.ox/core/extensions',
     'io.ox/core/api/autocomplete',
     'io.ox/contacts/util',
     'settings!io.ox/mail',
     'settings!io.ox/contacts',
     'gettext!io.ox/mail',
     'static/3rd.party/bootstrap-tokenfield/js/bootstrap-tokenfield.js',
     'static/3rd.party/typeahead.js/dist/typeahead.jquery.js',
     'css!3rd.party/bootstrap-tokenfield/css/bootstrap-tokenfield.css'
    ], function (sender, Dropdown, ext, AutocompleteAPI, contactsUtil, settings, contactSettings, gt) {

    $.fn.tokenize = function (o) {
        // defaults
        o = $.extend({
            api: null,
            model: null,
            attr: 'to',
            addClass: ''
        }, o || {});

        var input = $(this);

        input.tokenfield({
            createTokensOnBlur: true,
            minLength: contactSettings.get('search/minimumQueryLength', 3),
            typeahead: [{}, {
                    source: function(query, callback) {
                        autocompleteAPI.search(query).then(function (matches) {
                            callback(_(matches).map(function (data) {
                                return {
                                    value: data.email || data.phone || '',
                                    label: contactsUtil.getMailFullName(data),
                                    data: data
                                };
                            }));
                        });
                    },
                    templates: {
                        suggestion: function (item) {
                            var node = $('<div class="autocomplete-item">'),
                                baton = ext.Baton({ data: item.data, autocomplete: true });
                            ext.point('io.ox/mail/compose' + '/autoCompleteItem').invoke('draw', node, baton);
                            return node;
                        }
                    }
                }
            ]
        }).on({
            'tokenfield:createdtoken': function (e) {
                // A11y: set title
                var title = '',
                    token = $(e.relatedTarget);
                if (e.attrs) {
                    if (e.attrs.label !== e.attrs.value) {
                        title = e.attrs.label ? '"' + e.attrs.label + '" <' + e.attrs.value + '>' : e.attrs.value;
                    } else {
                        title = e.attrs.label;
                    }
                }
                token.attr({
                    title: title
                });
                if (e.attrs) {
                    // var data = e.attrs.data ? e.attrs.data.data : { email: e.attrs.value };
                    // token.prepend(
                    //     contactsAPI.pictureHalo(
                    //         $('<div class="contact-image">'),
                    //         $.extend(data, { width: 16, height: 16, scaleType: 'contain', hideOnFallback: true })
                    //     )
                    // );
                }
            },
            'change': function () {
                o.model.setTokens(o.attr, input.tokenfield('getTokens'));
            }
        });

        // add class to tokenfield wrapper
        input.parent().addClass(o.addClass);

        // set initial values
        input.tokenfield('setTokens', o.model.getTokens(o.attr) || [], true, false);


        // // display tokeninputfields if necessary
        // if (values.length) {
        //     self.toggleInput(type, false);
        // }


        // input.data('bs.tokenfield').$input.on({
        //     // IME support (e.g. for Japanese)
        //     compositionstart: function () {
        //         $(this).attr('data-ime', 'active');
        //     },
        //     compositionend: function () {
        //         $(this).attr('data-ime', 'inactive');
        //     },
        //     keydown: function (e) {
        //         if (e.which === 13 && $(this).attr('data-ime') !== 'active') {
        //             // clear tokenfield input
        //             $(this).val('');
        //         }
        //     },
        //     // shortcuts (to/cc/bcc)
        //     keyup: function (e) {
        //         if (e.which === 13) return;
        //         // look for special prefixes
        //         var val = $(this).val();
        //         if ((/^to:?\s/i).test(val)) {
        //             $(this).val('');
        //         } else if ((/^cc:?\s/i).test(val)) {
        //             $(this).val('');
        //             self.toggleInput('cc', false).find('.token-input').focus();
        //         } else if ((/^bcc:?\s/i).test(val)) {
        //             $(this).val('');
        //             self.toggleInput('bcc', false).find('.token-input').focus();
        //         }
        //     }
        // });

        return input;
    };

    var SenderDropdown = Dropdown.extend({
        update: function () {
            var $ul = this.$ul,
                self = this;
            _(this.model.changed).each(function (value, name) {
                var li = $ul.find('[data-name="' + name + '"]');
                li.children('i').attr('class', 'fa fa-fw fa-none');
                li.each(function() {
                    if ($(this).attr('data-value') ===  JSON.stringify(value)) {
                        $(this).children('i').attr('class', 'fa fa-fw fa-check');
                        self.label = $(this).children('span').text();
                        self.$el.find('a[data-toggle="dropdown"]').empty().append(
                            $.txt(self.label), $('<i class="fa fa-caret-down">')
                        );
                    }
                });
            }, this);
        },
        option: function (name, value, text) {
            this.$ul.append(
                $('<li>').append(
                    $('<a>', { href: '#', 'data-name': name, 'data-value': value, 'data-toggle': _.isBoolean(value) }).append(
                        $('<i class="fa fa-fw">').addClass(JSON.stringify(this.model.get(name)) === value ? 'fa-check' : 'fa-none'),
                        $('<span>').text(text)
                    )
                )
            );
            return this;
        }
    });

    var autocompleteAPI = new AutocompleteAPI({
        id: 'mailwrite',
        contacts: true,
        msisdn: true
    });

    var extensions = {

        title: function () {
            this.append(
                $('<div class="row header" data-extension-id="title">').append(
                    $('<h1 class="col-md-6 clear-title title">').text(gt('Compose new mail')),
                    $('<div class="col-md-6 text-right">').append(
                        $('<button type="button" class="btn btn-default" data-action="discard">').text(gt('Discard')),
                        $('<button type="button" class="btn btn-default" data-action="save">').text(gt('Save')),
                        $('<button type="button" class="btn btn-primary" data-action="send">').text(gt('Send'))
                    )
                )
            );
        },

        sender: function (baton) {

            var node = $('<div class="row sender" data-extension-id="sender">');

            sender.getDefaultSendAddressWithDisplayname().done(function (defaultSender) {

                baton.model.set('from', defaultSender);

                var dropdown = new SenderDropdown({ model: baton.model, label: defaultSender[0][0] + ' <' + defaultSender[0][1] + '>' }),
                    guid = _.uniqueId('form-control-label-');

                sender.drawDropdown().done(function (list) {

                    if (list.sortedAddresses.length >= 1) {
                        _.each(_(list.sortedAddresses).pluck('option'), function (item) {
                            dropdown.option('from', JSON.stringify([item]), item[0] + ' <' + item[1] + '>');
                        });
                    }

                    node.append(
                        $('<label class="maillabel col-xs-2 col-md-1">').text(gt('From')).attr({
                            'for': guid
                        }),
                        $('<div class="col-xs-10 col-md-11">').append(dropdown.render().$el.attr('data-dropdown', 'from'))
                    );
                });
            });

            this.append(node);
        },

        tokenfield: function (label, addActions) {
            addActions = addActions || false;
            label = String(label);
            var attr = label.toLowerCase();
            return function (baton) {
                var guid = _.uniqueId('form-control-label-'),
                    cls = 'row' + (addActions ? '' : ' hidden io-ox-core-animation slidedown in'),
                    input;
                this.append(
                    $('<div data-extension-id="' + attr + '">')
                        .addClass(cls)
                        .append(
                            $('<label class="maillabel col-xs-2 col-md-1">').text(gt(label)).attr({
                                'for': guid
                            }),
                            $('<div class="col-xs-10 col-md-11">').append(
                                input = $('<input type="text" class="form-control tokenfield">').attr({
                                    id: guid,
                                    tabindex: 1
                                }),
                                addActions ? $('<div class="recipient-actions">').append(
                                    $('<a href="#" data-action="add-cc" tabindex="1">').text(gt('CC')),
                                    $('<a href="#" data-action="add-bcc" tabindex="1">').text(gt('BCC'))
                                ) : $()
                            )
                        )
                    );
                input.tokenize({ model: baton.model, api: autocompleteAPI, attr: attr, addClass: attr });
            };
        },

        subject: function (baton) {
            var guid = _.uniqueId('form-control-label-');
            this.append(
                $('<div class="row subject" data-extension-id="subject">').append(
                    $('<label class="maillabel col-xs-2 col-md-1">').text(gt('Subject')).attr({
                        'for': guid
                    }),
                    $('<div class="col-xs-10 col-md-11">').append(
                        $('<input class="form-control">').val(baton.model.get('subject')).attr({
                            id: guid,
                            tabindex: 1
                        })
                    )
                )
            );
        },

        signature: function (baton) {
            var dropdown = new Dropdown({ model: baton.model, label: gt('Signature'), tagName: 'span' })
                .option('signature', '', gt('No signature'));
            require(['io.ox/core/api/snippets'], function (snippetAPI) {
                snippetAPI.getAll('signature').done(function (signatures) {
                    baton.view.signatures = signatures;
                    var sa = _.map(signatures, function (o) {
                        return { 'id': o.id, 'displayName': o.displayname };
                    });

                    if (sa.length >= 1) {
                        _.each(sa, function (item) {
                            dropdown.option('signature', item.id, item.displayName);
                        });
                    }
                });
            });

            this.append(
                $('<div class="col-xs-6 col-md-3">').append(
                    dropdown.render().$el
                        .attr('data-dropdown', 'signature')
                )
            );
        },

        attachment: function () {
            this.append(
                $('<div class="col-xs-12 col-md-6">').append(

                )
            );
        },

        body: function () {
            var self = this,
                editorId = _.uniqueId('tmce-'),
                editorToolbarId = _.uniqueId('tmcetoolbar-');

            self.append($('<div class="row">').append($('<div class="col-sm-12">').append(
                $('<div class="editable-toolbar">').attr('id', editorToolbarId),
                $('<div class="editable">').attr('id', editorId).css('min-height', '400px')
            )));
        },

        mailto: function () {
            // register mailto!
            if (settings.get('features/registerProtocolHandler', true)) {
                // only for browsers != firefox due to a bug in firefox
                // https://bugzilla.mozilla.org/show_bug.cgi?id=440620
                // maybe this will be fixed in the future by mozilla
                if (navigator.registerProtocolHandler && !_.browser.Firefox) {
                    var l = location, $l = l.href.indexOf('#'), url = l.href.substr(0, $l);
                    navigator.registerProtocolHandler(
                        'mailto', url + '#app=io.ox/mail/compose:compose&mailto=%s', ox.serverConfig.productNameMail
                    );
                }
            }
        }

    };

    return extensions;
});
