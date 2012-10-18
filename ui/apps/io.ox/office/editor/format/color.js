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
 * @author Carsten Driesner <carsten.driesner@open-xchange.com>
 */

define('io.ox/office/editor/format/color', ['io.ox/office/tk/utils'], function (Utils) {

    'use strict';

    // private static functions ===============================================

    /**
     * Converts a hex based rgb color value to a
     * number.
     *
     * @param {String} rgbColor
     * A hex based rgb color value (RRGGBB).
     *
     * @return {Number}
     * The integer based value of the hex string.
     */
    function convertRgbColorToNumber(rgbColor) {
        return parseInt(rgbColor, 16);
    }
    
    /**
     * Converts a number to a hex based rgb color string.
     *
     * @param {Number} colorValue
     * A rgb color value.
     *
     * @return {String}
     * Hex based color string (RRGGBB).
     */
    function convertNumberToRgbColor(colorValue) {
        return colorValue.toString(16);
    }
    
    /**
     * Converts a RGB color value to a HSL color object
     * which contains the attributes h (hue),
     * s (saturation) and l (luminance).
     *
     * @param {Number} rgbValue
     * The rgb color value to be converted to the HSL
     * color model.
     *
     * @return {Object}
     * The HSL color object which contains h,s,l attributes
     * based on the provided rgb color value.
     */
    function convertRgbToHsl(rgbValue) {
        var r, g, b, min, max, h, s, l;
       
        r = ((rgbValue & 16711680) >> 16) / 255;
        g = ((rgbValue & 65280) >> 8) / 255;
        b = (rgbValue & 255) / 255;
       
        min = Math.min(r, g, b);
        max = Math.max(r, g, b);
        
        l = (min + max) / 2;
        s = (min === max) ? 0 : (l < 0.5) ? (max - min) / (max + min) : (max - min) / (2.0 - max - min);
        h = 0;
        if (s !== 0) {
            h = ((max === r) ? (g - b) / (max - min) : (max === g) ? 2.0 + (b - r) / (max - min) : 4.0 + (r - g) / (max - min)) * 60;
            h = ((h < 0) ? h + 360 : h) / 360;
        }
            
        return { h: h, s: s, l: l };
    }
    
    /**
     * Converts a HSL color object to a rgb color value.
     *
     * @param {Object} hsl
     * The HSL color object which contains the color
     * attributes h, s, l
     *
     * @return {Number} rgb color value
     * The rgb color value calculated from the hsl color object.
     */
    function convertHslToRgb(hsl) {
        var r, g, b;
        
        if (hsl.s === 0) {
            r = g = b = Math.round(hsl.l * 255);
        }
        else {
            var t1, t2, tr, tg, tb;
            
            t1 = (hsl.l < 0.5) ? hsl.l * (1.0 + hsl.s) : hsl.l + hsl.s - hsl.l * hsl.s;
            t2 = 2 * hsl.l - t1;
            
            tr = hsl.h + (1 / 3);
            tg = hsl.h;
            tb = hsl.h - (1 / 3);
            
            tr = (tr < 0) ? tr + 1 : (tr > 1) ? tr - 1 : tr;
            tg = (tg < 0) ? tg + 1 : (tg > 1) ? tg - 1 : tg;
            tb = (tb < 0) ? tb + 1 : (tb > 1) ? tb - 1 : tb;
            
            var convChannel = function conv(ch) {
                if ((6 * ch) < 1)
                    return t2 + (t1 - t2) * 6 * ch;
                else if ((2 * ch) < 1)
                    return t1;
                else if ((3 * ch) < 2)
                    return t2 + (t1 - t2) * ((2 / 3) - ch) * 6;
                else
                    return t2;
            };
            
            r = Math.round(convChannel(tr) * 255);
            g = Math.round(convChannel(tg) * 255);
            b = Math.round(convChannel(tb) * 255);
        }
        
        return ((r << 16) + (g << 8) + b);
    }
    
    /**
     * Tints the rgb color value with the provided tint value
     * according to ooxml documentation.
     *
     * @param {Number} rgbValue
     *  The rgb color value.
     *
     * @param {String} shade
     *  A hex based value (00-FF) that is used to tint the
     *  rgb color value.
     *
     * @return {Number} tint rgb color value
     */
    function tintColor(rgbValue, tint) {
        var hsl = convertRgbToHsl(rgbValue);
        var tintValue = parseInt(tint, 16);
        hsl.l = hsl.l * (tintValue / 255) + (1 - (tintValue / 255));
        return convertHslToRgb(hsl);
    }
    
    /**
     * Shades the rgb color value with the provided shade value
     * according to ooxml documentation.
     *
     * @param {Number} rgbValue
     *  The rgb color value.
     *
     * @param {String} shade
     *  A hex based value (00-FF) that is used to shade the
     *  rgb color value.
     *
     * @return {Number} shaded rgb color value
     */
    function shadeColor(rgbValue, shade) {
        var hsl = convertRgbToHsl(rgbValue);
        var shadeValue = parseInt(shade, 16);
        hsl.l = hsl.l * (shadeValue / 255);
        return convertHslToRgb(hsl);
    }
    
    /**
     * Calculates the resulting RGB color from a source RGB color value
     * and a transformation array defining the transformation rules.
     *
     * @param {String} rgbColor
     *  The source color as a hexadecimal string (RRGGBB).
     *
     * @param {Array} transformations
     *  An array with transformation objects describing the
     *  transformation rules to be applied to the provided rgbColor.
     *
     * @returns {String}
     *  The resulting RGB color as a HEX string.
     */
    function transformRGBColor(rgbColor, transformations) {
        var color = rgbColor;
        
        if (transformations && (transformations.length > 0)) {
            color = convertRgbColorToNumber(rgbColor);
            _(transformations).each(function (transformation) {
                switch (transformation.type) {
                case 'shade':
                    color = shadeColor(color, transformation.value);
                    break;
                case 'tint':
                    color = tintColor(color, transformation.value);
                    break;
                default:
                    Utils.warn('Color.transformRGBColor(): unknown color transformation: ' + transformation.type);
                }
            });
            color = convertNumberToRgbColor(color);
        }
        return color;
    }

    // static class Color =====================================================

    /**
     * Predefined color objects.
     */
    var Color = {
            BLACK: { type: 'rgb', value: '000000' },
            WHITE: { type: 'rgb', value: 'FFFFFF' },
            AUTO: { type: 'auto' }
        };

    /**
     * Converts the passed attribute color object to a CSS color value.
     *
     * @param {Object} color
     *  The color object as used in operations.
     *
     * @param {String} context
     *  The context needed to resolve the color type 'auto'. Supported contexts
     *  are 'text' for text colors (mapped to to black), 'line' for line
     *  colors (e.g. table borders, maps to black), and 'fill' for fill colors
     *  (e.g. paragraph background and table cells, maps to transparent).
     *
     * @param {Themes} theme
     *  The theme object used to map scheme color names to color values.
     *
     * @returns {String}
     *  The CSS color value converted from the passed color object.
     */
    Color.getCssColor = function (color, context, theme) {

        var type = Utils.getStringOption(color, 'type', 'none'),
            transformations = Utils.getArrayOption(color, 'transformations', []),
            rgbColor = null;

        switch (type) {
        case 'rgb':
            rgbColor = transformRGBColor(color.value, transformations);
            break;
        case 'scheme':
            rgbColor = transformRGBColor(theme && theme.getSchemeColor(color.value), transformations);
            break;
        case 'auto':
            switch (context) {
            case 'text':
            case 'line':
                rgbColor = Color.BLACK.value;
                break;
            case 'fill':
                // transparent: keep rgbColor empty
                break;
            default:
                Utils.warn('Color.getCssColor(): unknown color context: ' + context);
                rgbColor = Color.BLACK.value;
            }
            break;
        default:
            Utils.warn('Color.getCssColor(): unknown color type: ' + type);
        }

        return _.isString(rgbColor) ? ('#' + rgbColor) : 'transparent';
    };
    
    /**
     * Determine if the provided color is dark or light
     *
     * @param {String} rgbColor
     * The rgb color as hex value string (RRGGBB) with/without trailing #
     */
    Color.isDark = function (rgbColor) {
        if (_.isString(rgbColor) && (6 <= rgbColor.length <= 7)) {
            var hsl, hexString = rgbColor.length === 6 ? rgbColor : rgbColor.substring(1);
            hsl = convertRgbToHsl(convertRgbColorToNumber(hexString));
            if (hsl.l < 0.5)
                return true;
            else
                return false;
        }
        
        return false;
    };

    // exports ================================================================

    return Color;

});
