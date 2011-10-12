/**
 * All content on this website (including text, images, source code and any
 * other original works), unless otherwise noted, is licensed under a Creative
 * Commons License.
 *
 * http://creativecommons.org/licenses/by-nc-sa/2.5/
 *
 * Copyright (C) Open-Xchange Inc., 2006-2011 Mail: info@open-xchange.com
 *
 * @author Christoph Kopp <christoph.kopp@open-xchange.com>
 */

define("io.ox/contacts/view-detail", [
        "io.ox/core/extensions",
        "io.ox/core/gettext",
        "io.ox/core/api/user",
        "io.ox/core/api/group",
        "io.ox/core/api/resource",
        "io.ox/contacts/base",
        "io.ox/contacts/view-qrcode"
    ], function (ext, gt, userAPI,
        groupAPI, resourceAPI, base, qr) {
       
 // smart join
        var join = function () {
            return _(arguments)
            .select(function (obj, i) {
                return i > 0 && !!obj;
            })
            .join(arguments[0] || "");
        };
        function addField(label, value, context, fn) {
            if (value) {
                var node = $("<tr>").appendTo(context);
                var td = $("<td>").addClass("value");
                node.append($("<td>").addClass("label").text(label));
                node.append(td);
                  
                if ($.isFunction(fn)) {
                    fn(td);
                } else {
                    if (typeof fn === "string") {
                        td.addClass(fn);
                    }
                    td.text(value);
                }
                return 1;
            } else {
                return 0;
            }
        }
        
        function addMail(label, value, context) {
            return addField(label, value, context, function (node) {
                node
                .addClass("blue")
                .append(
                    $("<a>", { href: "mailto: " + value })
                    .addClass("blue").text(value)
                );
            });
        }
        
        function addPhone(label, value, context) {
            return addField(label, value, context, function (node) {
                node
                .addClass("blue")
                .append(
                    $("<a>", { href: "callto: " + value })
                    .addClass("blue").text(value)
                );
            });
        }
        function addAddress(label, street, code, city, country, context) {
            return addField(label, true, context, function (node) {
                var a = $("<a>", {
                        href: "http://www.google.de/maps?q=" + encodeURIComponent(join(", ", street, join(" ", code, city))),
                        target: "_blank"
                    }).addClass("nolink");
                if (street) {
                    a.append($("<span>").text(street));
                    if (city) {
                        a.append($("<br>"));
                    }
                }
                if (code) {
                    a.append($("<span>").text(code + " "));
                }
                if (city) {
                    a.append($("<span>").text(city));
                }
                if (country) {
                    a.append($("<br>"));
                    a.append($("<span>").text(country));
                }
                a.append($("<br><small class='blue'>(Google Maps&trade;)</small>"));
                node.append(a);
            });
        }
        
        
    
        ext.point("io.ox/contacts/detail").extend({
            index: 100,
            id: "contact-details",
            draw: function (data) {
                var node = $("<tr>").appendTo(this);
                ext.point("io.ox/contacts/detail/head").invoke("draw", node, data);
                
            }
        });
        
  
        ext.point("io.ox/contacts/detail/head").extend({
            index: 100,
            id: 'contact-picture',
            draw: function (data) {
                $("<td>").css({ paddingBottom: "2em", width: "150px" })
                    .append($("<div>").addClass("picture")
                           .css({backgroundImage: "url(" + base.getImage(data) + ")"})).appendTo(this);
                
                $("<td>")
                    .css({ paddingTop: "2em", verticalAlign: "top" })
                    .append(
                        $("<div>").addClass("name clear-title").text(base.getFullName(data))
                    )
                    .append(
                        $("<div>").addClass("job clear-title").text(
                            data.mark_as_distributionlist ?
                                gt("Distribution list") :
                                (data.company || data.position || data.profession) ?
                                        join(", ", data.company, data.position, data.profession) + "\u00a0" :
                                        (data.email1 || data.email2 || data.email3) + "\u00a0"
                        )
                    ).appendTo(this);
            }
        });
        
        ext.point("io.ox/contacts/detail").extend({
            index: 100,
            id: "contact-details",
            draw: function (data) {
                ext.point("io.ox/contacts/detail/address").invoke("draw", this, data);
            }
        });
        ext.point("io.ox/contacts/detail").extend({
            index: 200,
            id: "contact-details",
            draw: function (data) {
                ext.point("io.ox/contacts/detail/phones").invoke("draw", this, data);
            }
        });
        ext.point("io.ox/contacts/detail").extend({
            index: 200,
            id: "contact-details",
            draw: function (data) {
                ext.point("io.ox/contacts/detail/mails").invoke("draw", this, data);
            }
        });
        ext.point("io.ox/contacts/detail").extend({
            index: 200,
            id: "contact-details",
            draw: function (data) {
                ext.point("io.ox/contacts/detail/birthday").invoke("draw", this, data);
            }
        });
        ext.point("io.ox/contacts/detail").extend({
            index: 200,
            id: "contact-details",
            draw: function (data) {
                ext.point("io.ox/contacts/detail/qr").invoke("draw", this, data);
            }
        });

        ext.point("io.ox/contacts/detail/address").extend({
            index: 100,
            id: 'contact-address',
            draw: function (data) {
                /*$("<td>").addClass("label").text("MEIN LABLE").appendTo(this);
                $("<td>").addClass("value").text(data.telephone_business1).appendTo(this);*/
                addField(gt("Department"), data.department, this);
                addField(gt("Position"), data.position, this);
                addField(gt("Profession"), data.profession, this);
                
                var r = 0;
                
                if (data.street_business || data.city_business) {
                    r += addAddress(gt("Work"), data.street_business, data.postal_code_business, data.city_business, null, this);
                }
                
                if (data.street_home || data.city_home) {
                    r += addAddress(gt("Home"), data.street_home, data.postal_code_home, data.city_home, null, this);
                }
                if (r > 0) {
                    addField("", "\u00a0", this);
                }
            }
        });
        
        ext.point("io.ox/contacts/detail/phones").extend({
            index: 100,
            id: 'contact-phone',
            draw: function (data) {
                var r = 0;
                r += addPhone(gt("Phone (business)"), data.telephone_business1, this);
                r += addPhone(gt("Phone (business)"), data.telephone_business2, this);
                r += addPhone(gt("Phone (private)"), data.telephone_home1, this);
                r += addPhone(gt("Phone (private)"), data.telephone_home2, this);
                r += addPhone(gt("Mobile"), data.cellular_telephone1, this);
                r += addPhone(gt("Mobile"), data.cellular_telephone2, this);
                if (r > 0) {
                    addField("", "\u00a0", this);
                }
            }
        });
        ext.point("io.ox/contacts/detail/mails").extend({
            index: 100,
            id: 'contact-mails',
            draw: function (data) {
                var dupl = {},
                    r = 0;
                r += addMail(gt("E-Mail"), data.email1, this);
                dupl[data.email1] = true;
                if (dupl[data.email2] !== true) {
                    r += addMail(gt("E-Mail"), data.email2, this);
                    dupl[data.email2] = true;
                }
                if (dupl[data.email3] !== true) {
                    r += addMail(gt("E-Mail"), data.email3, this);
                }
                if (r > 0) {
                    addField("", "\u00a0", this);
                }
            }
            
        });
        
        ext.point("io.ox/contacts/detail/birthday").extend({
            index: 100,
            id: 'contact-birthdays',
            draw: function (data) {
                var r = 0;
                var date = new Date(data.birthday);
                
                if (!isNaN(date.getDate())) {
                    r += addField(gt("Birthday"), date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear(), this);
                }
            }
            
        });
        ext.point("io.ox/contacts/detail/qr").extend({
            index: 100,
            id: 'qr',
            draw: function (data) {
                var r = 0;
                if (Modernizr.canvas) {
                    if (r > 0) {
                        addField("", "\u00a0", this);
                        r = 0;
                    }
                    addField("QR", true, this, function (td) {
                        console.log(td);
                        td.append(
                                $("<span>").addClass("link")
                                    .text("Show QR-code")
                                    .bind("click", function () {
                                        require(["io.ox/contacts/view-qrcode"], function (qr) {
                                            var vc = qr.getVCard(data);
                                            td.empty().qrcode(vc);
                                            vc = td = qr = null;
                                        });
                                    })
                            );
                    });
                }
            }
            
        });
        return {
            draw: function (data) {
                    var node;

                    if (!data) {
                        node = $();
                    } else {
                        node = $("<table>", {border: 0, cellpadding: 0, cellspacing: 0})
                            .addClass("contact-detail");
                        ext.point("io.ox/contacts/detail").invoke("draw", node, data);
                    }
                    return node;
                }
        };
    });