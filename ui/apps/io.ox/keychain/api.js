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
 * @author Francisco Laguna <francisco.laguna@open-xchange.com>
 */
 
 /**
 ext.point("io.ox/keychain/api").extend({
    id: ...,
    getAll: function () {
        // synchronously load all accounts of the given type
    },
    get: function (id) {
        // synchronously load the given account
    },
    getStandardAccount: function () {
        // synchronously fetch the standard account or null if there is no standard account
    },
    hasStandardAccount: function () {
        // return true, if there is a standard account, false otherwise
        
    },
    createInteractively: function () {
        // Open a dialog or wizard to create an account of this type
        // returns a deferred object that is resolved if the account creation went through or rejected, if it failed or was aborted.
    },
    remove: function (account) {
        // Delete the account
        // Returns a deferred that is resolved once the account has been deleted
    },
    update: function (account) {
        // Updates the account
        // returns a deferred that is resolved once the account has been updated
        // After the update #get and #getAll are supposed to return the new state.
    }
 })
 
 also add your plugin to serverConfig.plugins.keychain
 **/

define("io.ox/keychain/api", ["io.ox/core/extensions"].concat(ox.serverConfig.plugins.keychain || []), function (ext) {
    "use strict";
    
    var api = {};
    
    
    function initExtensions() {
        api.submodules = [];
        ext.point("io.ox/keychain/api").each(function (extension) {
            api.submodules[extension.id] = extension;
            extension.invoke("init");
        });
    }
    
    ext.point("io.ox/keychain/api").on("extended", initExtensions());
    
    function invokeExtension(accountType, method) {
        var extension = api.submodules[accountType];
    
        if (!extension) {
            throw new Error("I do not know keys of accountType " + accountType + "! I suppose a needed plugin was not registered in the server configuration.");
        }
        
        return extension.invoke.apply(extension, method, [extension].concat($.makeArray(arguments).slice(2)));
    }
    
    api.getAll = function () {
        var result = [];
        _(api.submodules).each(function (extension) {
            result = result.concat(invokeExtension(extension.id, "getAll"));
        });
        
        return result;
    };
    
    api.get = function (accountType, id) {
        return invokeExtension(accountType, "get", id);
    };
    
    api.getStandardAccount = function (accountType) {
        return invokeExtension(accountType, "getStandardAccount");
    };
    
    api.hasStandardAccount = function (accountType) {
        return invokeExtension(accountType, "hasStandardAccount");
    };
    
    api.getOrCreateStandardAccountInteractively = function (accountType) {
        if (!api.hasStandardAccount(accountType)) {
            return api.createInteractively(accountType);
        }
    };
    
    api.createInteractively = function (accountType) {
        return invokeExtension(accountType, "createInteractively");
    };
    
    api.remove = function (account) {
        if (account.attributes) {
            account = account.toJSON();
        }
        
        return invokeExtension(account.type, "remove");
    };
    
    api.update = function (account) {
        if (account.attributes) {
            account = account.toJSON();
        }
        
        return invokeExtension(account.type, "update");
    };
    
    return api;
    
});