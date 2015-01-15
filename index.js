'use strict';

/**
 * Representation of one single connection attempt.
 *
 * @constructor
 * @param {String} name Name of the attempt.
 * @param {TransportLayer} transport Constructor of a TransportLayer.
 * @param {Object} options Options for the transport & strategy instructions.
 * @api public
 */
function Attempt(name, transport, options) {
  this.name = name || transport.prototype.name;
  this.transport = transport;
  this.options = options || {};
  this.id = 0;
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
 * @param {TransportLayer} transport Constructor of a TransportLayer.
 * @param {Object} options Options for the transport & strategy instructions.
 * @returns {Strategy}
 * @api public
 */
Strategy.prototype.push = function push(name, transport, options) {
  var strategy = this
    , attempt;

  if (!(name instanceof Attempt)) attempt = new Attempt(name, transport, options);
  else attempt = name;

  if (!attempt.id) attempt.id = strategy.id++;
  strategy.length = strategy.transports.push(attempt);

  return strategy;
};

/**
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
    , transport
    , attempt
    , i = 0;

  for (0; i < strategy.transports.length; i++) {
    attempt = strategy.transports[i];
    transport = attempt.transport;

    if (
         'crossdomain' in config && config.crossdomain !== transport.crossdomain
      || 'writable' in config && config.writable !== transport.writable
      || 'readable' in config && config.readable !== transport.readable
      || 'not' in config && attempt.name in config.not
      || 'id' in config && attempt.id < config.id
      || !transport.supported
    ) continue;

    transports.push(attempt);
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
      if (config.available === transports[i].transport.available()) {
        strategy.transport = transports[i].id;
        return fn(undefined, transports[i]), strategy;
      }
    }

    fn();
  } else {
    attempt = transports.shift();
    strategy.transport = attempt.id;
    attempt.transport.available(function ready() {
      fn(undefined, attempt);
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
  if (!this.transports) return false;

  this.transports = this.transport = null;
  return true;
};

//
// Expose the strategy.
//
Strategy.Attempt = Attempt;
module.exports = Strategy;
