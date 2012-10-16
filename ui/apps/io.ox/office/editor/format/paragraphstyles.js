/**
 * All content on this website (including text, images, source
 * code and any other original works), unless otherwise noted,
 * is licensed under a Creative Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2012
 * Mail: info@open-xchange.com
 *
 * @author Daniel Rentz <daniel.rentz@open-xchange.com>
 */

define('io.ox/office/editor/format/paragraphstyles',
    ['io.ox/office/tk/utils',
     'io.ox/office/editor/dom',
     'io.ox/office/editor/format/lineheight',
     'io.ox/office/editor/format/stylesheets',
     'io.ox/office/editor/format/color'
    ], function (Utils, DOM, LineHeight, StyleSheets, Color) {

    'use strict';

    var // definitions for paragraph attributes
        definitions = {

            alignment: {
                def: 'left',
                set: function (element, value) {
                    element.css('text-align', value);
                },
                preview: function (options, value) {
                    options.css.textAlign = value;
                }
            },

            // Logically, the line height is a paragraph attribute. But technically
            // in CSS, the line height must be set separately at every span element
            // because a relative CSS line-height attribute at the paragraph (e.g.
            // 200%) will not be derived relatively to the spans, but absolutely
            // according to the paragraph's font size. Example: The paragraph has a
            // font size of 12pt and a line-height of 200%, resulting in 24pt. This
            // value will be derived absolutely to a span with a font size of 6pt,
            // resulting in a relative line height of 24pt/6pt = 400% instead of
            // the expected 200%.
            lineheight: {
                def: LineHeight.SINGLE,
                set: function (element, lineHeight) {
                    lineHeight = LineHeight.validateLineHeight(lineHeight);
                    element.children('span').each(function () {
                        LineHeight.setElementLineHeight($(this), lineHeight);
                    });
                }
            },

            fillcolor: {
                def: Color.AUTO, // auto for paragraph fill resolves to 'transparent'
                set: function (element, color) {
                    element.css('background-color', this.getCssColor(color, 'fill'));
                }
            },

            ilvl: {
                def: '',
                set: function (element, value) {
                }
            },

            numId: {
                def: '',
                set: function (element, value) {
                }
            }

        };

    // class ParagraphStyles ==================================================

    /**
     * Contains the style sheets for paragraph formatting attributes. The CSS
     * formatting will be read from and written to paragraph <p> elements.
     *
     * @constructor
     *
     * @extends StyleSheets
     *
     * @param {HTMLElement|jQuery} rootNode
     *  The root node containing all elements formatted by the style sheets of
     *  this container. If this object is a jQuery collection, uses the first
     *  node it contains.
     *
     * @param {DocumentStyles} documentStyles
     *  Collection with the style containers of all style families.
     */
    function ParagraphStyles(rootNode, documentStyles) {

        /**
         * Will be called for every paragraph whose attributes have been
         * changed.
         *
         * @param {jQuery} para
         *  The <p> element whose character attributes have been changed, as
         *  jQuery object.
         *
         * @param {Object} attributes
         *  A map of all attributes (name/value pairs), containing the
         *  effective attribute values merged from style sheets and explicit
         *  attributes.
         */
        function updateParaFormatting(para, attributes) {
            // take care of numberings
            if (attributes.ilvl && attributes.numId) {
                var numberingElement = $('<div>');
                numberingElement.addClass('list-label');
                var listObject = this.getDocumentStyles().getLists().formatNumber(attributes.numId, attributes.ilvl, [0]);
                numberingElement.text(listObject.text);
                $(para).prepend(numberingElement);
            }
        }
        // base constructor ---------------------------------------------------

        StyleSheets.call(this, 'paragraph', definitions, documentStyles, {
            globalSetHandler: updateParaFormatting,
            descendantStyleFamilies: 'character'
        });

        // methods ------------------------------------------------------------

        /**
         * Iterates over all paragraph elements covered by the passed DOM
         * ranges for read-only access and calls the passed iterator function.
         */
        this.iterateReadOnly = function (ranges, iterator, context) {
            // DOM.iterateAncestorNodesInRanges() passes the current element to
            // the passed iterator function exactly as expected
            return DOM.iterateAncestorNodesInRanges(ranges, rootNode, 'div.p', iterator, context);
        };

        /**
         * Iterates over all paragraph elements covered by the passed DOM
         * ranges for read/write access and calls the passed iterator function.
         */
        this.iterateReadWrite = this.iterateReadOnly;

    } // class ParagraphStyles

    // exports ================================================================

    // derive this class from class StyleSheets
    return StyleSheets.extend({ constructor: ParagraphStyles });

});
