/* istanbul ignore next */
describe('strategy', function () {
  'use strict';

  var Negotiation = require('negotiation')
    , TL = require('transport-layer')
    , assume = require('assume')
    , Strategy = require('./')
    , strategy
    , tls = [];

  beforeEach(function () {
    strategy = new Strategy(tls);
  });

  afterEach(function () {
    strategy.destroy();
  });

  it('is exported as function', function () {
    assume(Strategy).is.a('function');
  });

  it('can be construced without `new` keyword', function () {
    strategy.destroy();
    strategy = Strategy();

    assume(strategy).instanceOf(Strategy);
    assume(strategy.push).is.a('function');
  });

  it('exposes the Attempt constructor', function () {
    assume(Strategy.Attempt).is.a('function');
  });

  it('can add transports through the constructor', function () {
    strategy.destroy();
    strategy = new Strategy([
      new Strategy.Attempt('foo', {})
    ]);

    assume(strategy).length(1);
    assume(strategy.transports[0].name).equals('foo');
  });

  describe('Attempt', function () {
    it('uses the provided name of the transport', function () {
      var named = TL.extend({ name: 'named' })
        , attempt = new Strategy.Attempt(undefined, named);

      assume(attempt.name).equals('named');
    });
  });

  describe('#select', function () {
    var readyState = require('transport-layer/exports').readystate;

    beforeEach(function () {
      strategy.push('readable', r);
      strategy.push('writable', w);
      strategy.push('crossdomain', xd);
      strategy.push('read & write', rw);
    });

    var r = TL.extend({}, { supported: true, readable: true })
      , w = TL.extend({}, { supported: true, writable: true })
      , xd = TL.extend({}, { supported: true, crossdomain: true })
      , rw = TL.extend({}, { supported: true, readable: true, writable: true });

    it('selects only readable transports', function (next) {
      strategy.select({ readable: true }, function (err, attempt) {
        if (err) return next(err);

        assume(attempt).is.instanceOf(Strategy.Attempt);
        assume(strategy.transport).equals(attempt.id);
        assume(attempt.transport).equals(r);

        next();
      });
    });

    it('it waits until a transport is available', function (next) {
      var ready = false;

      //
      // Reset the readyState so we can trigger a change event.
      //
      readyState.readyState = 0;

      strategy.select({
        readable: true
      }, function (err, attempt) {
        if (err) return next(err);

        assume(attempt).is.instanceOf(Strategy.Attempt);
        assume(strategy.transport).equals(attempt.id);
        assume(attempt.transport).equals(r);
        ready = true;
      });

      setTimeout(function () {
        assume(ready).is.false();
        readyState.change('complete');
        assume(ready).is.true();
        next();
      }, 100);

      assume(ready).is.false();
    });

    it('can filter out transports based on name', function (next) {
      strategy.select({
        not: { readable: true },
        readable: true
      }, function (err, attempt) {
        if (err) return next(err);

        assume(attempt.transport).equals(rw);

        next();
      });
    });

    it('can find writable transports', function (next) {
      strategy.select({
        writable: true
      }, function (err, attempt) {
        if (err) return next(err);

        assume(attempt.transport).equals(w);

        next();
      });
    });

    it('can find crossdomain transports', function (next) {
      strategy.select({
        crossdomain: true
      }, function (err, attempt) {
        if (err) return next(err);

        assume(attempt.transport).equals(xd);

        next();
      });
    });

    it('can filter based upon id', function (next) {
      strategy.select({
        id: 3
      }, function (err, attempt)  {
        if (err) return next(err);

        assume(attempt.transport).equals(rw);

        next();
      });
    });

    it('calls the callback even if there are no matches', function (next) {
      strategy.select({
        id: 10 // non-existing id
      }, function (err, attempt) {
        if (err) return next(err);

        assume(attempt).is.undefined();
        next();
      });
    });

    it('selects an available transport', function (next) {
      strategy.select({
        available: true,
        readable: true
      }, function (err, attempt) {
        if (err) return next(err);

        assume(attempt.transport.available()).is.true();

        next();
      });
    });
  });

  describe('#push', function () {
    it('is a function', function () {
      assume(strategy.push).is.a('function');
    });

    it('returns it self', function () {
      assume(strategy.push('foo', {})).equals(strategy);
    });

    it('saves the newly added transport and increments the length', function () {
      strategy.destroy();
      strategy = new Strategy();

      assume(strategy).has.length(0);

      strategy.push('foo', {});
      assume(strategy).has.length(1);

      assume(strategy.transports[0]).is.instanceOf(Strategy.Attempt);
      assume(strategy.transports[0].name).equals('foo');
    });

    it('accepts Attempt instances', function () {
      var attempt = new Strategy.Attempt('foo', 1);

      strategy.push(attempt);

      assume(strategy).has.length(1);
      assume(strategy.transports[0]).is.instanceOf(Strategy.Attempt);
      assume(strategy.transports[0].name).equals('foo');
      assume(strategy.transports[0].id).equals(0);
    });

    it('increments ids', function () {
      assume(strategy.id).equals(0);

      strategy.push('foo', {});

      assume(strategy.id).equals(1);
      assume(strategy.transports[0].id).equals(0);

      strategy.push('foo', {});
      assume(strategy.id).equals(2);
      assume(strategy.transports[1].id).equals(1);
    });

    it('does not override the id', function () {
      var attempt = new Strategy.Attempt('foo', 1);
      attempt.id = 'foo';

      strategy.push(attempt);

      assume(strategy).has.length(1);
      assume(strategy.transports[0]).is.instanceOf(Strategy.Attempt);
      assume(strategy.transports[0].name).equals('foo');
      assume(strategy.transports[0].id).equals('foo');
    });
  });
});
