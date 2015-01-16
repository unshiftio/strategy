# Strategy

[![Made by unshift][made-by]](http://unshift.io)[![Version npm][version]](http://browsenpm.org/package/strategy)[![Build Status][build]](https://travis-ci.org/unshiftio/strategy)[![Dependencies][david]](https://david-dm.org/unshiftio/strategy)[![Coverage Status][cover]](https://coveralls.io/r/unshiftio/strategy?branch=master)[![IRC channel][irc]](http://webchat.freenode.net/?channels=unshift)

[made-by]: https://img.shields.io/badge/made%20by-unshift-00ffcc.svg?style=flat-square
[version]: https://img.shields.io/npm/v/strategy.svg?style=flat-square
[build]: https://img.shields.io/travis/unshiftio/strategy/master.svg?style=flat-square
[david]: https://img.shields.io/david/unshiftio/strategy.svg?style=flat-square
[cover]: https://img.shields.io/coveralls/unshiftio/strategy/master.svg?style=flat-square
[irc]: https://img.shields.io/badge/IRC-irc.freenode.net%23unshift-00a8ff.svg?style=flat-square

Strategy implements a strategy for selecting the correct transport based on a
given set of restrictions. The module should work for every transport that is
created using the [`transport-layer`][TL] module.

## Installation

As this module can be used with node.js and browserify it's released in the `npm`
registry and can be installed using:

```
npm install --save recovery
```

The `--save` tells npm to automatically add the installed version to your
`package.json` if one exists.

## Usage

In all API examples we assume that you've already required and initialized a new
Strategy instance using:

```js
'use strict';

var Strategy = require('strategy')
  , Policy = Strategy.Policy
  , strategy = new Strategy();
```

The `Strategy` constructor allows one option argument and that is a list of
pre-generated `Policy` instances (don't worry, you can always add more later). A
`Policy` instance accepts the following arguments:

1. Name of the policy, It can be omitted if you want to use the `.name` from the
   Transport's prototype.
2. Transport Layer transport.
3. Additional options that should be used for constructing a new instance.

```js
var TransportLayer = require('transport-layer')
  , WebSockets
  , attempt;

WebSockets = TransportLayer.extend({
  name: 'websockets'
}, {
  readyState: 'complete',
  crossdomain: true,
  readable: true,
  writable: true
});

attempt = new Policy(WebSockets, { /* options * /});

// or:

attempt = new Policy('WebSockets', WebSockets, { /* options */});
```

Now that you've got some transports created you can assign them supply them to
Strategy:

```js
strategy = new Strategy([attempt /*, .. and more .. */]);
```

### strategy.push

Add new Policy to the strategy. If you don't supply a policy instance as first
argument we will automatically create a new one. The following arguments are
accepted by this method:

1. Name of the policy your about to push. If this is an `Policy` instance, we
   will not create a new one and you can safely ignore all other arguments.
2. Transport that belongs to this policy.
3. Options for the transport.

```js
strategy
.push(attempt)
.push('websockets', WebSockets, { foo: 'bar' })
.push(TransportLayer.extend({ 'iframes' }, { readable: true }));
```

### strategy.select

Select a new policy from the strategy. To find a suitable policy we need to know
some specifics first. These specifics can be:

- **`crossdomain`**: The transport should work cross domain.
- **`not`**: The transport should not be in the given list, should be an object
  where the keys are **lowercase** names of the policies we should exclude.
- **`available`**: The transport should be.
- **`readable`**: The transport should be readable.
- **`writable`**: The transport should be readable.
- **`id`**: The id we should start at.

The method requires 2 arguments:

- Configuration object with one or multiple properties mentioned.
- Completion callback which follows an error first callback pattern.

```js
strategy.select({
  crossdomain: true,
  not: { jsonp: true, htmlfile: true },
  readable: true,
  available: 'complete'
}, function (err, policy) {
  console.log(policy.name);       // Name of the policy, in lowercase.
  console.log(policy.transport);  // Reference to transport.
  console.log(policy.options);    // Additional configuration.
});
```

### strategy.destroy

Completely destroy the strategy instance.

```js
strategy.destroy();
```

## License

MIT

[TL]: https://github.com/unshiftio/transport-layer
