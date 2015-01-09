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
  if (!(this instanceof Strategy)) return new Strategy(transports, options);

  this.transports = [];
  this.transport = 0;

  for (var i = 0; i < transports.length; i++) {
    transports[i].id = i;
    this.transports.push(transports);
  }
}

/**
 * Options:
 *
 * - crossdomain: The transport should work cross domain.
 * - not: The transport should not be in the given list.
 * - available: The transport should be.
 * - readable: The transport should be readable.
 * - writable: The transport should be readable.
 *
 * @param {Object} options
 * @param {Function} fn
 * @returns {Strategy}
 * @api public
 */
Strategy.prototype.select = function select(options, fn) {
  //
  //   I: Start with some preliminary filtering to ensure that all get all
  //      we only have transports that satisfy the given set of requirements.
  //      Availability doesn't matter yet.
  //
  var transports = this.transports.filter(function filter(attempt) {
    var transport = attempt.transport;

    if (
         'crossdomain' in options && options.crossdomain !== transport.crossdomain
      || 'writable' in options && options.writable !== transport.writable
      || 'readable' in options && options.readable !== transport.readable
      || 'not' in options && attempt.name in options.not
      || !transport.supported
    ) return false;

    return true;
  });

  //
  //  II: Now that we have a set transports we can start.
  //
  if (transports.length)

  //|| 'available' in options && options.available !== transport.available()

  return this;
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
