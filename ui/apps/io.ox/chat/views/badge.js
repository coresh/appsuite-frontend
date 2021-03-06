/**
 * This work is provided under the terms of the CREATIVE COMMONS PUBLIC
 * LICENSE. This work is protected by copyright and/or other applicable
 * law. Any use of the work other than as authorized under this license
 * or copyright law is prohibited.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * © 2017 OX Software GmbH, Germany. info@open-xchange.com
 *
 * @author Matthias Biggeleben <matthias.biggeleben@open-xchange.com>
 */

define('io.ox/chat/views/badge', ['io.ox/backbone/views/disposable', 'io.ox/chat/views/state'], function (DisposableView, StateView) {

    'use strict';

    var Badgeiew = DisposableView.extend({

        tagName: 'button',
        className: 'user-badge',

        initialize: function () {
            this.listenTo(this.model, 'change:first_name change:last_name', this.onChangeName);
        },

        render: function () {
            this.$el
                .attr({ 'data-cmd': 'start-private-chat', 'data-id': this.model.get('id') })
                .append(
                    new StateView({ model: this.model }).render().$el,
                    $('<span class="name">').text(this.model.getName())
                );
            return this;
        },

        onChangeName: function () {
            this.$('.name').text(this.model.getName());
        }
    });

    return Badgeiew;
});
