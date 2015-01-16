'use strict';

/**
 * Representation of one single transport policy.
 *
 * @constructor
 * @param {String} name Name of the policy
 * @param {TransportLayer} Transport Constructor of a TransportLayer.
 * @param {Object} options Options for the transport & strategy instructions.
 * @api public
 */
function Policy(name, Transport, options) {
  var policy = this;

  if ('string' !== typeof name) {
    options = Transport;
    Transport = name;
    name = undefined;
  }

  if ('function' !== typeof Transport) {
    throw new Error('Transport should be a constructor.');
  }

  policy.name = (name || Transport.prototype.name).toLowerCase();
  policy.Transport = Transport;
  policy.options = options || {};
  policy.id = 0;
}

/**
 * Transport selection strategy.
 *
 * @constructor
 * @param {Array} transports Array of transports that should be added.
 * @param {Object} options Optional configuration.
 * @api public
 */
function Strategy(transports, options) {
  var strategy = this;

  if (!(strategy instanceof Strategy)) return new Strategy(transports, options);
  if (Object.prototype.toString.call(transports) !== '[object Array]') {
    options = transports;
    transports = [];
  }

  strategy.transports = [];     // List of active transports.
  strategy.transport = 0;       // Current selected transport id.
  strategy.length = 0;          // Amount of transports available.
  strategy.id = 0;              // ID generation pool.

  for (var i = 0; i < transports.length; i++) {
    strategy.push(transports[i]);
  }
}

/**
 * Add a new strategy to the internal transports selection.
 *
 * @param {String} name Name of the transport.
 * @param {TransportLayer} Transport Constructor of a TransportLayer.
 * @param {Object} options Options for the transport & strategy instructions.
 * @returns {Strategy}
 * @api public
 */
Strategy.prototype.push = function push(name, Transport, options) {
  var strategy = this
    , policy;

  if (!(name instanceof Policy)) policy = new Policy(name, Transport, options);
  else policy = name;

  if (!policy.id) policy.id = strategy.id++;
  strategy.length = strategy.transports.push(policy);

  return strategy;
};

/**
 * Select a new policy from the strategy.
 *
 * Options:
 *
 * - crossdomain: The transport should work cross domain.
 * - not: The transport should not be in the given list.
 * - available: The transport should be.
 * - readable: The transport should be readable.
 * - writable: The transport should be readable.
 * - id: The id we should start at.
 *
 * @param {Object} config Configuration for selecting transports.
 * @param {Function} fn Completion callback.
 * @returns {Strategy}
 * @api public
 */
Strategy.prototype.select = function select(config, fn) {
  //
  //   I: Start with some preliminary filtering to ensure that all get all
  //      we only have transports that satisfy the given set of requirements.
  //      Availability doesn't matter yet.
  //
  var transports = []
    , strategy = this
    , Transport
    , policy
    , i = 0;

  for (0; i < strategy.transports.length; i++) {
    policy = strategy.transports[i];
    Transport = policy.Transport;

    if (
         'crossdomain' in config && config.crossdomain !== Transport.crossdomain
      || 'writable' in config && config.writable !== Transport.writable
      || 'readable' in config && config.readable !== Transport.readable
      || 'not' in config && policy.name in config.not
      || 'id' in config && policy.id < config.id
      || !Transport.supported
    ) continue;

    transports.push(policy);
  }

  //
  // Bail out early if we have nothing to upgrade to any more.
  //
  if (!transports.length) return fn(), strategy;

  //
  //  II: Now that we have a set transports we can figure out we need to search
  //  for
  //
  if ('available' in config) {
    for (i = 0; i < transports.length; i++) {
      if (config.available === transports[i].Transport.available()) {
        strategy.transport = transports[i].id;
        return fn(undefined, transports[i]), strategy;
      }
    }

    fn();
  } else {
    policy = transports.shift();
    strategy.transport = policy.id;
    policy.Transport.available(function ready() {
      fn(undefined, policy);
    });
  }

  return strategy;
};

/**
 * Destroy the Strategy instance so all references can be garbage collected.
 *
 * @returns {Boolean}
 * @api public
 */
Strategy.prototype.destroy = function destroy() {
  var strategy = this;

  if (!strategy.transports) return false;

  strategy.transports = strategy.transport = strategy.length = strategy.id = null;
  return true;
};

//
// Expose the strategy.
//
Strategy.Policy = Policy;
module.exports = Strategy;
