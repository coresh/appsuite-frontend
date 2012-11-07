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
 * @author Ingo Schmidt-Rosbiegal <ingo.schmidt-rosbiegal@open-xchange.com>
 */
define('io.ox/office/editor/selection',
    ['io.ox/core/event',
     'io.ox/office/tk/utils',
     'io.ox/office/editor/dom',
     'io.ox/office/editor/position'
    ], function (Events, Utils, DOM, Position) {

    'use strict';

    // class Selection ========================================================

    /**
     * An instance of this class represents a selection in the edited document,
     * consisting of a logical start and end position representing a half-open
     * text range, or a rectangular table cell range.
     *
     * @constructor
     *
     * @param {HTMLElement|jQuery} rootNode
     *  The root node of the document. If this object is a jQuery collection,
     *  uses the first node it contains.
     */
    function Selection(rootNode) {

        var // self reference
            self = this,

            // logical start position
            startPosition = [],

            // logical end position (half-open range)
            endPosition = [],

            // whether the current text range has been selected backwards
            backwards = false,

            // object node currently selected, as jQuery collection
            selectedObject = $(),

            // whether this selection represents a rectangular table cell range
            cellRangeSelected = false;

        // TODO: convert editor code to use methods instead of member access
        // (especially, do not modify these arrays from outside...)
        this.startPaM = { oxoPosition: startPosition };
        this.endPaM = { oxoPosition: endPosition };

        // private methods ----------------------------------------------------

        /**
         * Returns the first logical text position in the document.
         */
        function getFirstTextPosition() {
            var firstSpan = Utils.findDescendantNode(rootNode, function () { return DOM.isPortionSpan(this); });
            return Position.getOxoPosition(rootNode, firstSpan, 0);
        }

        /**
         * Returns the last logical text position in the document.
         */
        function getLastTextPosition() {
            var lastSpan = Utils.findDescendantNode(rootNode, function () { return DOM.isPortionSpan(this); }, { reverse: true });
            return Position.getOxoPosition(rootNode, lastSpan, lastSpan.firstChild.nodeValue.length);
        }

        /**
         * Converts the passed logical text position to a valid DOM point as
         * used by the internal browser selection.
         *
         * @param {Number[]} position
         *  The logical position of the target node. Must be the position of a
         *  paragraph child node, either a text span, a text component (fields,
         *  tabs), or an object node.
         *
         * @returns {DOM.Point|Null}
         *  The DOM-Point object representing the passed logical position, or
         *  null, if the passed position is invalid.
         */
        function getPointForTextPosition(position) {

            var // resolve position to DOM element
                nodeInfo = Position.getDOMPosition(rootNode, position, true);

            // check that the position selects a paragraph child node
            if (nodeInfo && nodeInfo.node && DOM.isParagraphNode(nodeInfo.node.parentNode)) {

                // convert to a valid DOM point: text spans to text nodes with offset,
                // otherwise DOM element point, consisting of parent node and own sibling index
                return DOM.isTextSpan(nodeInfo.node) ?
                    new DOM.Point(nodeInfo.node.firstChild, nodeInfo.offset) :
                    DOM.Point.createPointForNode(nodeInfo.node);
            }

            return null;
        }

        /**
         * Initializes this selection with the passed start and end points, and
         * validates the browser selection by moving the start and end points
         * to editable nodes.
         *
         * @param {DOM.Point} anchorPoint
         *  The DOM anchor point of a selected range. This is the side of the
         *  range where selecting with mouse or keyboard has been started.
         *
         * @param {DOM.Point} focusPoint
         *  The DOM focus point of a selected range. This is the side of the
         *  range that will be extended when selection will be changed while
         *  dragging the mouse with pressed button, or with cursor keys while
         *  holding the SHIFT key. May be located before the passed anchor
         *  position.
         *
         * @param {Boolean} [backwards]
         *  If set to true, the new browser selection originates from a cursor
         *  navigation key that moves the cursor backwards in the document.
         */
        function setSelectionRange(anchorPoint, focusPoint, backwards) {

            var // adjusted points (start before end)
                startPoint = null, endPoint = null,
                // whether position is a single cursor
                isCursor = DOM.Point.equalPoints(anchorPoint, focusPoint),
                // selected object node
                objectInfo = null;

            // adjust start and end position
            backwards = !isCursor && (DOM.Point.comparePoints(anchorPoint, focusPoint) > 0);
            startPoint = backwards ? focusPoint : anchorPoint;
            endPoint = backwards ? anchorPoint : focusPoint;

            // calculate start and end position
            self.startPaM.oxoPosition = startPosition = Position.getTextLevelOxoPosition(startPoint, rootNode, false);
            self.endPaM.oxoPosition = endPosition = Position.getTextLevelOxoPosition(endPoint, rootNode, !isCursor);

            // check for cell range selection
            cellRangeSelected = $(anchorPoint.node).is('tr') && $(focusPoint.node).is('tr');

            // check for object selection
            DOM.clearObjectSelection(selectedObject);
            selectedObject = $();
            if (!cellRangeSelected && self.isSingleComponentSelection()) {
                objectInfo = Position.getDOMPosition(rootNode, startPosition, true);
                if (objectInfo && DOM.isObjectNode(objectInfo.node)) {
                    selectedObject = $(objectInfo.node);
                    // TODO: move call to DOM.drawObjectSelection() to here once
                    // editor code becomes independent from explicit mouse handlers
                }
            }

            // draw correct browser selection
            self.restoreBrowserSelection();

            // notify listeners
            self.trigger('change');
        }

        // methods ------------------------------------------------------------

        this.isValid = function () {
            return (startPosition.length > 0) && (endPosition.length > 0);
        };

        this.getStartPosition = function () {
            return _.clone(startPosition);
        };

        this.getEndPosition = function () {
            return _.clone(endPosition);
        };

        this.isTextCursor = function () {
            return !cellRangeSelected && _.isEqual(startPosition, endPosition);
        };

        this.isBackwards = function () {
            return backwards;
        };

        this.hasRange = function () {
            return !_.isEqual(startPosition, endPosition);
        };

        /**
         * Returns the type of this selection as string.
         *
         * @returns {String}
         *  Returns 'text' for a text range or text cursor, or 'cell' for a
         *  rectangular cell range in a table, or 'object' for an object
         *  selection.
         */
        this.getSelectionType = function () {
            return cellRangeSelected ? 'cell' : (selectedObject.length > 0) ? 'object' : 'text';
        };

        /**
         * Returns whether the start and end position of this selection are
         * located in the same parent component (all array elements but the
         * last are equal).
         *
         * @param {Number} [parentLevel=1]
         *  The number of parent levels. If omitted, the direct parents of the
         *  start and end position will be checked (only the last element of
         *  the position array will be ignored). Otherwise, the specified
         *  number of trailing array elements will be ignored (for example, a
         *  value of 2 checks the grand parents).
         *
         * @returns {Boolean}
         *  Whether the start and end position are located in the same parent
         *  component.
         */
        this.hasSameParentComponent = function (parentLevel) {
            return Position.hasSameParentComponent(startPosition, endPosition, parentLevel);
        };

        /**
         * Returns whether this selection covers exactly one component.
         *
         * @returns {Boolean}
         *  Returns whether the selection is covering a single component. The
         *  start and end position must refer to the same parent component, and
         *  the last array element of the end position must be the last array
         *  element of the start position increased by the value 1.
         */
        this.isSingleComponentSelection = function () {
            return this.hasSameParentComponent() && (_.last(startPosition) === _.last(endPosition) - 1);
        };

        /**
         * Returns the logical position of the closest common component
         * containing all nodes covered by this selection (the leading array
         * elements that are equal in the start and end position arrays).
         *
         * @returns {Number[]}
         *  The logical position of the closest common component containing
         *  this selection. May be the empty array if the positions already
         *  differ in their first element.
         */
        this.getClosestCommonPosition = function () {

            var index = 0, length = Math.min(startPosition.length, endPosition.length);

            // compare all array elements but the last ones
            while ((index < length) && (startPosition[index] === endPosition[index])) {
                index += 1;
            }

            return startPosition.slice(0, index);
        };

        /**
         * Returns the closest table that contains all nodes of this selection
         * completely.
         *
         * @returns {HTMLTableElement|Null}
         *  The closest table containing this selection; or null, if the
         *  selection is not contained in a single table.
         */
        this.getEnclosingTable = function () {

            var // position of closest common parent component containing the selection
                commonPosition = this.getClosestCommonPosition();

            // the closest table containing the common parent component
            return (commonPosition.length > 0) ? Position.getCurrentTable(rootNode, commonPosition) : null;
        };

        /**
         * Returns the object node currently selected.
         *
         * @returns {jQuery}
         *  A jQuery collection containing the currently selected object, if
         *  existing; otherwise an empty jQuery collection.
         */
        this.getSelectedObject = function () {
            return selectedObject;
        };

        // selection manipulation ---------------------------------------------

        /**
         * Restores the browser selection according to the current logical
         * selection represented by this instance.
         *
         * @returns {Selection}
         *  A reference to this instance.
         */
        this.restoreBrowserSelection = function () {

            var // the DOM ranges representing the logical selection
                ranges = [],
                // start and end DOM point for text selection
                startPoint = null, endPoint = null;

            switch (this.getSelectionType()) {

            // text selection: select text range
            case 'text':
                startPoint = Position.getDOMPosition(rootNode, startPosition);
                endPoint = Position.getDOMPosition(rootNode, endPosition);
                if (startPoint && endPoint) {
                    ranges.push(new DOM.Range(backwards ? endPoint : startPoint, backwards ? startPoint : endPoint));
                } else {
                    Utils.error('Selection.restoreBrowserSelection(): missing text selection range');
                }
                break;

            // cell selection: iterate all cells
            case 'cell':
                this.iterateTableCells(function (cell) {
                    ranges.push(DOM.Range.createRangeForNode(cell));
                });
                break;

            // do not set any browser selection in object selection mode
            case 'object':
                break;

            default:
                Utils.error('Selection.restoreBrowserSelection(): unknown selection type');
            }

            DOM.setBrowserSelection(ranges);
            return this;
        };

        /**
         * Calculates the own logical selection according to the current
         * browser selection.
         *
         * @param {Boolean} [backwards]
         *  If set to true, the new browser selection originates from a cursor
         *  navigation key that moves the cursor backwards in the document.
         */
        this.updateFromBrowserSelection = function (backwards) {

            var // the current browser selection
                browserSelection = DOM.getBrowserSelection(rootNode),
                // the active range
                activeRange = browserSelection.active;

            if (activeRange) {

                // allowing multi-selection for tables (rectangular cell selection)
                if ($(activeRange.start.node).is('tr')) {
                    activeRange.start = _(browserSelection.ranges).first().start;
                    activeRange.end = _(browserSelection.ranges).last().end;
                }

                // calculate logical start and end position
                setSelectionRange(activeRange.start, activeRange.end, backwards);

            } else if (selectedObject.length === 0) {
                Utils.warn('Selection.updateFromBrowserSelection(): missing valid browser selection');
            }

            return this;
        };

        /**
         * Selects the passed logical text range in the document.
         *
         * @param {Number[} newStartPosition
         *  The logical position of the first text component in the selection.
         *  Must be the position of a paragraph child node, either a text span,
         *  a text component (fields, tabs), or an object node.
         *
         * @param {Number[]} [newEndPosition]
         *  The logical position behind the last text component in the
         *  selection (half-open range). Must be the position of a paragraph
         *  child node, either a text span, a text component (fields, tabs), or
         *  an object node. If omitted, sets a text cursor according to the
         *  passed start position.
         *
         * @returns {Selection}
         *  A reference to this instance.
         */
        this.setTextSelection = function (newStartPosition, newEndPosition) {

            var // DOM points for start and end position
                startPoint = _.isArray(newStartPosition) ? getPointForTextPosition(newStartPosition) : null,
                endPoint = _.isArray(newEndPosition) ? getPointForTextPosition(newEndPosition) : null;

            if (startPoint) {
                setSelectionRange(startPoint, endPoint || startPoint);
            } else {
                Utils.warn('Selection.setTextSelection(): expecting text positions, start=' + JSON.stringify(newStartPosition) + ', end=' + JSON.stringify(newEndPosition));
            }

            return this;
        };

        /**
         * Sets the text cursor to the first available cursor position in the
         * document. Skips leading floating objects in the first paragraph. If
         * the first content node is a table, selects its first available
         * cell paragraph (may be located in a sub table in the first outer
         * cell).
         *
         * @returns {Selection}
         *  A reference to this instance.
         */
        this.selectTopPosition = function () {
            return this.setTextSelection(getFirstTextPosition());
        };

        /**
         * Selects the entire document.
         *
         * @returns {Selection}
         *  A reference to this instance.
         */
        this.selectAll = function () {
            return this.setTextSelection(getFirstTextPosition(), getLastTextPosition());
        };

        /**
         * If this selection selects an object node, changes the browser
         * selection to a range that starts directly before that object node,
         * and ends directly after that object.
         *
         * @returns {Selection}
         *  A reference to this instance.
         */
        this.selectObjectAsText = function () {

            var // whether the object is in inline mode
                inline = DOM.isInlineObjectNode(selectedObject),
                // previous text span of the object node
                prevTextSpan = inline ? selectedObject[0].previousSibling : null,
                // next text span of the object node (skip following floating objects)
                nextTextSpan = Utils.findNextNode(selectedObject.parent(), selectedObject, function () { return DOM.isPortionSpan(this); }),
                // DOM points representing the text selection over the object
                startPoint = null, endPoint = null;

            if (selectedObject.length > 0) {

                // remove object selection boxes
                DOM.clearObjectSelection(selectedObject);

                // start point after the last character preceding the object
                if (DOM.isPortionSpan(prevTextSpan)) {
                    startPoint = new DOM.Point(prevTextSpan.firstChild, prevTextSpan.firstChild.nodeValue.length);
                }
                // end point before the first character following the object
                if (DOM.isPortionSpan(nextTextSpan)) {
                    endPoint = new DOM.Point(nextTextSpan.firstChild, 0);
                }

                // set browser selection (do nothing if no start and no end point
                // have been found - but that should never happen)
                if (startPoint || endPoint) {
                    if (backwards) {
                        DOM.setBrowserSelection(new DOM.Range(endPoint || startPoint, startPoint || endPoint));
                    } else {
                        DOM.setBrowserSelection(new DOM.Range(startPoint || endPoint, endPoint || startPoint));
                    }
                }
            }

            return this;
        };

        // iterators ----------------------------------------------------------

        /**
         * Calls the passed iterator function for each table cell, if this
         * selection is located inside a table. Processes a rectangular cell
         * selection (if supported by the browser), otherwise a row-oriented
         * text selection inside a table.
         *
         * @param {Function} iterator
         *  The iterator function that will be called for every table cell node
         *  covered by this selection. Receives the following parameters:
         *      (1) {HTMLTableCellElement} the visited DOM cell element,
         *      (2) {Number[]} its logical position.
         *  If the iterator returns the Utils.BREAK object, the iteration
         *  process will be stopped immediately.
         *
         * @param {Object} [context]
         *  If specified, the iterator will be called with this context (the
         *  symbol 'this' will be bound to the context inside the iterator
         *  function).
         *
         * @returns {Utils.BREAK|Undefined}
         *  A reference to the Utils.BREAK object, if the iterator has returned
         *  Utils.BREAK to stop the iteration process, otherwise undefined.
         */
        this.iterateTableCells = function (iterator, context) {

            var // the closest table containing the selection, and its position
                table = this.getEnclosingTable(), tablePosition = null,

                // position of top-left and bottom-right cell, relative to table
                firstPosition = null, lastPosition = null,
                // the DOM cells
                firstCellInfo = null, lastCellInfo = null,
                // current cell, and its logical position
                cellInfo = null, cellNode = 0, cellPosition = null,

                // row and column index for iteration
                row = 0, col = 0;

            // returns the next cell (either sibling, or in following row) in the same table
            function findNextCell(cellNode) {

                var rowNode = null;

                // next sibling cell
                if (cellNode.nextSibling) {
                    return cellNode.nextSibling;
                }

                // first child of next table row
                // TODO: can there be empty rows, e.g. if all cells are merged vertically?
                rowNode = cellNode.parentNode.nextSibling;
                while (rowNode && !rowNode.hasChildNodes()) {
                    rowNode = rowNode.nextSibling;
                }
                return rowNode && rowNode.firstChild;
            }

            // check enclosing table, get its position
            if (!table) {
                Utils.warn('Selection.iterateTableCells(): selection not contained in a single table');
                return;
            }
            tablePosition = Position.getOxoPosition(rootNode, table, 0);

            // convert selection position to cell position relative to table
            if ((startPosition.length < tablePosition.length + 2) || (endPosition.length < tablePosition.length + 2)) {
                Utils.error('Selection.iterateTableCells(): invalid start or end position');
                return;
            }
            firstPosition = startPosition.slice(tablePosition.length, tablePosition.length + 2);
            lastPosition = endPosition.slice(tablePosition.length, tablePosition.length + 2);

            // resolve position to closest table cell
            firstCellInfo = Position.getDOMPosition(table, firstPosition, true);
            lastCellInfo = Position.getDOMPosition(table, lastPosition, true);
            if (!firstCellInfo || !$(firstCellInfo.node).is('td') || !lastCellInfo || !$(lastCellInfo.node).is('td')) {
                Utils.error('Selection.iterateTableCells(): no table cells found for cell positions');
                return;
            }

            // visit all cells for rectangular cell selection mode
            if (cellRangeSelected) {

                for (row = firstPosition[0]; row <= lastPosition[0]; row += 1) {
                    for (col = firstPosition[1]; col <= lastPosition[1]; col += 1) {
                        cellPosition = tablePosition.concat([row, col]);
                        cellInfo = Position.getDOMPosition(rootNode, cellPosition);
                        if (cellInfo && $(cellInfo.node).is('td')) {
                            if (iterator.call(context, cellInfo.node, cellPosition) === Utils.BREAK) { return Utils.BREAK; }
                        } else {
                            Utils.warn('Selection.iterateTableCells(): cannot find cell at position ' + JSON.stringify(cellPosition));
                            return;
                        }
                    }
                }

            // otherwise: visit all cells row-by-row (text selection mode)
            } else {

                cellNode = firstCellInfo.node;
                while (cellNode) {

                    // visit current cell
                    cellPosition = tablePosition.concat(Position.getOxoPosition(table, cellNode, 0));
                    if (iterator.call(context, cellNode, cellPosition) === Utils.BREAK) { return Utils.BREAK; }

                    // last cell reached
                    if (cellNode === lastCellInfo.node) { return; }

                    // find next cell node (either next sibling, or first child of next row)
                    cellNode = findNextCell(cellNode);
                }

                // in a valid DOM tree, there must always be valid cell nodes until
                // the last cell has been reached, so this point should never be reached
                Utils.error('Selection.iteraTableCells(): iteration exceeded selection');
            }
        };

        /**
         * Calls the passed iterator function for specific content nodes
         * (tables and paragraphs) selected by this selection instance. It is
         * possible to visit all paragraphs embedded in all covered tables and
         * nested tables, or to iterate on the 'shortest path' by visiting
         * tables exactly once if they are covered completely by the selection
         * range and skipping the embedded paragraphs and sub tables. If the
         * selection range end at the very beginning of a paragraph (before the
         * first character), this paragraph is not considered to be included in
         * the selected range.
         *
         * @param {Function} iterator
         *  The iterator function that will be called for every content node
         *  (paragraphs and tables) covered by this selection. Receives the
         *  following parameters:
         *      (1) {HTMLElement} the visited content node,
         *      (2) {Number[]} its logical position,
         *      (3) {Number|Undefined} the logical index of the first text
         *          component covered by the first paragraph, undefined for
         *          all other paragraphs and tables (may point after the last
         *          existing child text component, if the selection starts at
         *          the very end of a paragraph),
         *      (4) {Number|Undefined} the logical index of the last child text
         *          component covered by the last paragraph (closed range, will
         *          be -1 for empty paragraphs), undefined for all other
         *          paragraphs and tables.
         *  If the iterator returns the Utils.BREAK object, the iteration
         *  process will be stopped immediately.
         *
         * @param {Object} [context]
         *  If specified, the iterator will be called with this context (the
         *  symbol 'this' will be bound to the context inside the iterator
         *  function).
         *
         * @param {Object} [options]
         *  A map of options to control the iteration. Supports the following
         *  options:
         *  @param {Boolean} [options.shortestPath=false]
         *      If set to true, tables that are covered completely by this
         *      selection will be visited, but their descendant components
         *      (paragraphs and embedded tables) will be skipped in the
         *      iteration process. By default, this method visits all
         *      paragraphs embedded in all tables and their sub tables, but
         *      does not visit the table objects. Has no effect for tables that
         *      contain the end paragraph, because these tables are not fully
         *      covered by the selection. Tables that contain the start
         *      paragraph will never be visited, because they start before the
         *      selection.
         *
         * @returns {Utils.BREAK|Undefined}
         *  A reference to the Utils.BREAK object, if the iterator has returned
         *  Utils.BREAK to stop the iteration process, otherwise undefined.
         */
        this.iterateContentNodes = function (iterator, context, options) {

            var // start node and offset (pass true to NOT resolve text spans to text nodes)
                startInfo = Position.getDOMPosition(rootNode, startPosition, true),
                // end node and offset (pass true to NOT resolve text spans to text nodes)
                endInfo = Position.getDOMPosition(rootNode, endPosition, true),

                // whether to iterate on shortest path (do not traverse into completely covered tables)
                shortestPath = Utils.getBooleanOption(options, 'shortestPath', false),

                // paragraph nodes containing the passed start and end positions
                firstParagraph = null, lastParagraph = null,
                // current content node while iterating
                contentNode = null;

            // visit the passed content node (paragraph or table); or table child nodes, if not in shortest-path mode
            function visitContentNode(contentNode) {

                var // each call of the iterator get its own position array (iterator is allowed to modify it)
                    position = Position.getOxoPosition(rootNode, contentNode),
                    // start text offset in first paragraph
                    startOffset = (contentNode === firstParagraph) ? _.last(startPosition) : undefined,
                    // end text offset in last paragraph (convert half-open range to closed range)
                    endOffset = (contentNode === lastParagraph) ? (_.last(endPosition) - 1) : undefined;

                // visit the content node, but not the last paragraph, if selection
                // does not start in that paragraph and end before its beginning
                // (otherwise, it's a cursor in an empty paragraph)
                if ((contentNode === firstParagraph) || (contentNode !== lastParagraph) || (endOffset >= 0)) {
                    return iterator.call(context, contentNode, position, startOffset, endOffset);
                }
            }

            // find the next content node in DOM tree (either table or embedded paragraph depending on shortest-path option)
            function findNextContentNode(rootNode, contentNode, lastParagraph) {

                // find next content node in DOM tree (searches in siblings of the own
                // parent, AND in other nodes following the parent node, e.g. the next
                // table cell, or paragraphs following the containing table, etc.)
                contentNode = Utils.findNextNode(rootNode, contentNode, DOM.CONTENT_NODE_SELECTOR);

                // iterate into a table, if shortest-path option is off, or the end paragraph is inside the table
                while (DOM.isTableNode(contentNode) && (!shortestPath || (lastParagraph && contentNode.contains(lastParagraph)))) {
                    contentNode = Utils.findDescendantNode(contentNode, DOM.CONTENT_NODE_SELECTOR);
                }

                return contentNode;
            }

            // check validity of passed positions
            if (!startInfo || !startInfo.node || !endInfo || !endInfo.node) {
                Utils.warn('Selection.iterateContentNodes(): invalid selection');
                return;
            }

            // TODO! entire table selected

            // rectangular cell range selection: visit all table cells
            if (cellRangeSelected) {
                return this.iterateTableCells(function (cell) {

                    // iterate all content nodes according to 'shortest-path' option
                    contentNode = Utils.findDescendantNode(cell, DOM.CONTENT_NODE_SELECTOR, { children: true });
                    while (contentNode) {

                        // visit current content node
                        if (visitContentNode(contentNode) === Utils.BREAK) { return Utils.BREAK; }

                        // iterate as long as there are more content nodes in the cell
                        contentNode = findNextContentNode(cell, contentNode);
                    }
                }, this);
            }

            // find first and last paragraph node
            firstParagraph = startInfo.node.parentNode;
            lastParagraph = endInfo.node.parentNode;
            if (!DOM.isParagraphNode(firstParagraph) || !DOM.isParagraphNode(lastParagraph)) {
                Utils.warn('Selection.iterateContentNodes(): text selection expected');
                return;
            }

            // iterate through all paragraphs and tables until the end paragraph has been reached
            contentNode = firstParagraph;
            while (contentNode) {

                // visit current content node
                if (visitContentNode(contentNode) === Utils.BREAK) { return Utils.BREAK; }

                // end of selection reached
                if (contentNode === lastParagraph) { return; }

                // find next content node in DOM tree (next sibling paragraph or
                // table, or first node in next cell, or out of last table cell...)
                contentNode = findNextContentNode(rootNode, contentNode, lastParagraph);
            }

            // in a valid DOM tree, there must always be valid content nodes until end
            // paragraph has been reached, so this point should never be reached
            Utils.error('Selection.iterateContentNodes(): iteration exceeded selection');
        };

        /**
         * Calls the passed iterator function for specific nodes selected by
         * this selection instance. It is possible to visit all child nodes
         * embedded in all covered paragraphs (also inside tables and nested
         * tables), or to iterate on the 'shortest path' by visiting content
         * nodes (paragraphs or tables) exactly once if they are covered
         * completely by this selection and skipping the embedded paragraphs,
         * sub tables, and text contents.
         *
         * @param {Function} iterator
         *  The iterator function that will be called for every node covered by
         *  this selection. Receives the DOM node object as first parameter,
         *  its logical start position as second parameter, and the logical
         *  length of the element as third parameter. Position and length will
         *  cover only a part of a text span element, if the text span is
         *  partly covered by the start or end position of the selection. If
         *  the iterator returns the Utils.BREAK object, the iteration process
         *  will be stopped immediately.
         *
         * @param {Object} [context]
         *  If specified, the iterator will be called with this context (the
         *  symbol 'this' will be bound to the context inside the iterator
         *  function).
         *
         * @param {Object} [options]
         *  A map of options to control the iteration. Supports the following
         *  options:
         *  @param {Boolean} [options.shortestPath=false]
         *      If set to true, tables and paragraphs that are covered
         *      completely by this selection will be visited directly and once,
         *      and their descendant components will be skipped in the
         *      iteration process. By default, this method visits the child
         *      nodes of all paragraphs and tables embedded in tables. Has no
         *      effect for tables that contain the end paragraph, because these
         *      tables are not fully covered by the selection. Tables that
         *      contain the start paragraph will never be visited, because they
         *      start before the selection.
         *  @param {Boolean} [options.split=false]
         *      If set to true, the first and last text span not covered
         *      completely by this selection will be split before the iterator
         *      function will be called. The iterator function will always
         *      receive a text span that covers the contained text completely.
         *
         * @returns {Utils.BREAK|Undefined}
         *  A reference to the Utils.BREAK object, if the iterator has returned
         *  Utils.BREAK to stop the iteration process, otherwise undefined.
         */
        this.iterateNodes = function (iterator, context, options) {

            var // whether to iterate on shortest path (do not traverse into completely covered content nodes)
                shortestPath = Utils.getBooleanOption(options, 'shortestPath', false),
                // split partly covered text spans before visiting them
                split = Utils.getBooleanOption(options, 'split', false),

                // start node and offset
                startInfo = null;

            // special case 'simple cursor': visit the text span
            if (this.isTextCursor()) {

                // start node and offset (pass true to NOT resolve text spans to text nodes)
                startInfo = Position.getDOMPosition(rootNode, startPosition, true);
                if (!startInfo || !startInfo.node) {
                    Utils.warn('Selection.iterateNodes(): invalid selection');
                    return;
                }

                // if located at the beginning of a component: use end of preceding text span if available
                if ((startInfo.offset === 0) && DOM.isPortionSpan(startInfo.node.previousSibling)) {
                    startInfo.node = startInfo.node.previousSibling;
                }

                // visit the text component node (clone, because iterator is allowed to change passed position)
                return iterator.call(context, startInfo.node, _.clone(startPosition), 0);
            }

            // iterate the content nodes (paragraphs and tables) covered by the selection
            return this.iterateContentNodes(function (contentNode, position, startOffset, endOffset) {

                var // single-component selection
                    singleComponent = false,
                    // text span at the very beginning or end of a paragraph
                    textSpan = null;

                // visit fully covered content node in 'shortest-path' mode
                if (shortestPath && !_.isNumber(startOffset) && !_.isNumber(endOffset)) {
                    return iterator.call(context, contentNode, position, 1);
                }

                // if selection starts after the last character in a paragraph, visit the last text span
                if (_.isNumber(startOffset) && (startOffset >= Position.getLastTextNodePositionInParagraph(contentNode))) {
                    textSpan = DOM.findLastPortionSpan(contentNode);
                    return textSpan ? iterator.call(context, textSpan, position.concat([startOffset]), 0) : undefined;
                }

                // if selection ends before the first character in a paragraph, visit the first text span
                if (_.isNumber(endOffset) && (endOffset < Position.getFirstTextNodePositionInParagraph(contentNode))) {
                    textSpan = DOM.findFirstPortionSpan(contentNode);
                    return textSpan ? iterator.call(context, textSpan, position.concat([endOffset + 1]), 0) : undefined;
                }

                // visit covered text components in the paragraph
                singleComponent = _.isNumber(startOffset) && _.isNumber(endOffset) && (startOffset === endOffset);
                return Position.iterateParagraphChildNodes(contentNode, function (node, nodeStart, nodeLength, nodeOffset, offsetLength) {

                    // skip floating objects (unless they are selected directly) and helper nodes
                    if (DOM.isTextSpan(node) || DOM.isTextComponentNode(node) || DOM.isInlineObjectNode(node) || (singleComponent && DOM.isFloatingObjectNode(node))) {
                        // create local copy of position, iterator is allowed to change the array
                        return iterator.call(context, node, position.concat([nodeStart + nodeOffset]), offsetLength);
                    }

                // options for Position.iterateParagraphChildNodes(): visit empty text spans
                }, this, { allNodes: true, start: startOffset, end: endOffset, split: split });

            // options for Selection.iterateContentNodes()
            }, this, { shortestPath: shortestPath });

        };

        this.destroy = function () {
            this.events.destroy();
        };

        // initialization -----------------------------------------------------

        // add event hub
        Events.extend(this);

    } // class Selection

    // export =================================================================

    return Selection;

});
