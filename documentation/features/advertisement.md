---
title: Advertisement
---

AppSuite features a basic framework to help implementing ads.
Usually code snippets generated by some advertisment provider is meant to be used on static web sites.
Integrating it into a web application might not be straight forward.
That's why this framework has been created.
It defines some common areas (ad spaces) to serve banners in different forms, it provides an API to refresh those
banners on different events (e.g. app change, some timeout, …), and it helps to integrate the code snippets needed to
actually run the campaigns by the provider.

# Configuration

Configuration for the `io.ox/ads` framework must be provided by a plugin in the [namespace](components/plugins/01_create-plugins#namespace)
`io.ox/ads`.

All registered plugins for `io.ox/ads` will get loaded and the return values of their modules will be handed as
parameters for invocation of the `inject` method (with `this` being bound to `$('head')`) as well as the `config`
method of the extension point `io.ox/ads`.
It is therefore possible to customize this functionality by extending `io.ox/ads`.

When using the default implementation, custom modules should return an object containing two keys:

- `inject` - a String with valid HTML code which is to be appended to the head element
- `config` - the configuration is simply stored internally

The `config` object can contain arbitrary data.
The `changeModule` method of the `io.ox/ads` extension point will be invoked with the app name as first parameter
and a [Baton](../extension-points/04-baton.html) containing a reference to the app and the `config` object.

The default implementation expects the `config` object to contain one key for each [space](advertisment#spaces).
Values for these keys used in the default implementation should be an object defining:

- `space` - a String which defines the desired target space for this ad
- `html` - a String which is appended to the corresponding [space](advertisment#spaces)
- `reloadAfter` - a number value, representing the time until the next refresh operation for an area is invoked
- `showInModules` - `falsy` value (always active) OR an array with app names to match against (e.g. `'io.ox/mail'`, …)

For every defined area, the `cleanup` method of the corresponding extension point will be invoked.
Active spaces are determined by filtering using `showInModules` options in the area configuration.
By extending `io.ox/ads` extension point implementing the `filter` method, the filtering behaviour can be customized.
For every active area, the `draw` method of the extension point will be invoked. (See [Spaces section](advertisment#spaces))
The `reload` method of the area extension point will be invoked in a regular interval defined by the value of `reloadAfter`.
The configuration object will be passed to each method invocation.


## API

Easy access to the gathered configuration is possible via the `io.ox/ads/config` module.
The provided methods are:

- `load`: store a given configuration. No need to call this manually, the framework uses this internally.
    In case you need to add configuration later, this function can be used.
- `get`: get all configuration values in an Array
- `forSpace`: only return configuration for a given [space name](advertisment#spaces)

# Spaces

There is a list of [extension points](extension-points/01_general) defined, which can be used to place banners.
All points share a similar API:

```javascript
ext.point('the/spaces/name').extend({
    cleanup: function (baton) { /* do some cleanup */ },
    draw: function (baton) { /* append baton.data.html to the spaces element, do other stuff */ },
    reload: function (baton) { /* trigger a reload of the banner */ }
    defaults: function (baton) { /* add default values to baton.data, like for sizes or size mappings */ }
});
```

The following ad spaces are pre-defined and can be used to serve ads:

- io.ox/ads/leaderboard
- io.ox/ads/skyscraper
- io.ox/ads/skyscraperLeft
- io.ox/ads/driveFolder
- io.ox/ads/portalBackground
- io.ox/ads/portalBillboard
- io.ox/ads/mailBackground
- io.ox/ads/mailDetail
- io.ox/ads/mailSentOverlay
- io.ox/ads/logout

In order to activate one of these spaces, a [custom plugin](components/plugins/01_create-plugins) is needed, shipping a
configuration as described [above](#Configuration).

## Default values

The implementation of the ad space extension points provide a defaults method that can be invoked to get some default configuration
values.
The results will be stored in the data section of a Baton object.
The current implemntation allows to fetch default sizes and size mappings (mappings of screen space to banner sizes,
see [GPT documentaiton](https://developers.google.com/doubleclick-gpt/reference#googletag.sizeMapping) for details) for all
ad spaces.
Those can of course be customized by implementing a custom `defaults` method for each ad space extension.
These sizes contain tested values, which are known to work quite well in AppSuite context.

Usage example:

```
var defaults = ext.Baton.ensure({
    sizes: [],
    sizeMappings: []
});
ext.point('io.ox/ads/leaderboard').invoke('defaults', undefined, defaults);
console.log(defaults.data.sizes, defaults.data.sizeMappings);
```

Besides `sizes` and `sizeMappings`, many spaces define default values for the `showInModules` configuration attribute.

# Utility API

Most ad campaigns share common needs regarding functionality.
The `io.ox/ads` framework provides a set of tools to simplify custom implementations.

## Cooldown

Sometimes, there are events that should trigger a reload of ad banners, but should not do so too frequently.
You want an ad space to *cool down* a certain amount of time, before a reload is actually triggered.
That's where `Cooldown` timers come in handy.

To use those timers, a new instance of the `Cooldown` util class is needed:

```
var config = loadConfig(); // the current list of configured ads
var Cooldown = require('io.ox/ads/util').Cooldown;
var cooldown = new Cooldown(config);
```

The instance can then be used like this:

```
ext.point('io.ox/ads/leaderboard').extend({
    reload: function (baton) {
        cooldown.touch(baton.data.id).then(function () {
            // do the refresh, only called if space is "cool"
        }, function () {
            // ad space is too hot, did not refresh, but may be collect some metrics?
        });
    }
});

// reset cooldown timer for third banner in configuration
var id = 2;
cooldown.reset(id);

// reset all cooldown timers
cooldown.reset();
```

## List of ad spaces

For convenience, there is a list of ad spaces provided through the utility class.
It can be used to iterate over all spaces:

```
util.spaces.forEach(function (space) {
    ext.point(space).extend(/* … */);
});
```

## Module mappings

For convenience, a mapping from generic “module names” to specific module ids is provided.
This mapping can be used to refer to a group of modules which belong together, like a mapping from `mail` to `['io.ox/mail', 'io.ox/mail/detail', 'io.ox/mail/compose']`.
The main purpose is to use it in the configuration:

```
[{
  "space": "io.ox/ads/leaderboard",
  "showInModules": ["mail", "portal"]
}]
```

# Customization

The default behavior can be completely customized using well-known methods, [extension points](extension-points).
Despite the special points for the [spaces](#Spaces) as described above, it is possible to extend the general point `io.ox/ads`.
The API for this point looks like this:

```javascript
ext.point('io.ox/ads').extend({
    changeModule: function (baton) { /* do something if user opens a new app/module */ },
    filter: function (baton) { /* result is expected in baton.activeAds, apply your filter function here */ },
    config: function (baton) { /* do something with the configuration */ },
    inject: function (baton) { /* inject the global JS from ad provider, this variable is bound to $('head') */ }
});
```

As a reference implementation and a starting point, [this](https://github.com/Open-Xchange-Frontend/adexample) project can be used.
The implementation is used to demonstrate the integration of a few [spaces](#Spaces) using a little more than just a minimal configuration.

# Google Publisher Tag

The io.ox/ads API natively supports using Doubleclick GPT as a provider for ad space content.
Implementing a campaign should be possible without any JavaScript code, by just providing configuration
for the desired slots.
This is achieved using the [default values](#Default values) feature.

A minimal configuration for the `io.ox/ads/leaderboard` ad space might look like this:

```
[{
    "space": "io.ox/ads/leaderboard",
    "gpt": {
        "adUnitPath": "/1234567/test_ads"
    },
    "cooldown": 5000,
    "reloadAfter": 30000
}]
```

This will setup an automatic reload after 30s and installing a [cooldown](#Cooldown) timer to not refresh before 5s have past since
the last reload event.
Banners will be served from the ad unit `/1234567/test_ads`, which needs to be defined within GPT.

# Incompatible changes since 7.8.2 release

## Removed some filters from the default implementation

Filters that can easily be implemented in the middleware, have been removed from frontend code.
Those attributes are not used to filter the list of active ads any longer:

* capabilities
* active

In order to add custom support this, use the `io.ox/ads` extension point and implement a custom `filter` method.

```
ext.point('io.ox/ads').extend({
    filter: function (baton) {
        baton.activeAds = baton.activeAds.filter(function(conf) {
            return conf.active && capabilities.has(conf.capabilities);
        });
    }
});
```