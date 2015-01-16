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

  it('exposes the Strategy constructor', function () {
    assume(Strategy.Policy).is.a('function');
  });

  it('can add transports through the constructor', function () {
    strategy.destroy();
    strategy = new Strategy([
      new Strategy.Policy('foo', function () {})
    ]);

    assume(strategy).length(1);
    assume(strategy.transports[0].name).equals('foo');
  });

  describe('Policy', function () {
    it('uses the provided name of the transport', function () {
      var named = TL.extend({ name: 'named' })
        , policy = new Strategy.Policy(named, { foo: 'bar' });

      assume(policy.name).equals('named');
      assume(policy.options).deep.equals({ foo: 'bar' });
    });

    it('throws when Transport is not a function', function () {
      assume(function () {
        return new Strategy.Policy('foo');
      }).throws(/transport/i);
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
      strategy.select({ readable: true }, function (err, policy) {
        if (err) return next(err);

        assume(policy).is.instanceOf(Strategy.Policy);
        assume(strategy.transport).equals(policy.id);
        assume(policy.Transport).equals(r);

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
      }, function (err, policy) {
        if (err) return next(err);

        assume(policy).is.instanceOf(Strategy.Policy);
        assume(strategy.transport).equals(policy.id);
        assume(policy.Transport).equals(r);
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
      }, function (err, policy) {
        if (err) return next(err);

        assume(policy.Transport).equals(rw);

        next();
      });
    });

    it('can find writable transports', function (next) {
      strategy.select({
        writable: true
      }, function (err, policy) {
        if (err) return next(err);

        assume(policy.Transport).equals(w);

        next();
      });
    });

    it('can find crossdomain transports', function (next) {
      strategy.select({
        crossdomain: true
      }, function (err, policy) {
        if (err) return next(err);

        assume(policy.Transport).equals(xd);

        next();
      });
    });

    it('can filter based upon id', function (next) {
      strategy.select({
        id: 3
      }, function (err, policy)  {
        if (err) return next(err);

        assume(policy.Transport).equals(rw);

        next();
      });
    });

    it('calls the callback even if there are no matches', function (next) {
      strategy.select({
        id: 10 // non-existing id
      }, function (err, policy) {
        if (err) return next(err);

        assume(policy).is.undefined();
        next();
      });
    });

    it('selects an available transport', function (next) {
      strategy.select({
        available: true,
        readable: true
      }, function (err, policy) {
        if (err) return next(err);

        assume(policy.Transport.available()).is.true();

        next();
      });
    });

    it('calls the callback with no results if nothing is available', function (next) {
      readyState.readyState = 0;

      strategy.select({
        available: true,
      }, function (err, policy) {
        if (err) return next(err);

        assume(policy).is.a('undefined');

        next();
      });
    });
  });

  describe('#push', function () {
    it('is a function', function () {
      assume(strategy.push).is.a('function');
    });

    it('returns it self', function () {
      assume(strategy.push('foo', function () {})).equals(strategy);
    });

    it('saves the newly added transport and increments the length', function () {
      strategy.destroy();
      strategy = new Strategy();

      assume(strategy).has.length(0);

      strategy.push('foo', function () {});
      assume(strategy).has.length(1);

      assume(strategy.transports[0]).is.instanceOf(Strategy.Policy);
      assume(strategy.transports[0].name).equals('foo');
    });

    it('accepts Policy instances', function () {
      var policy = new Strategy.Policy('foo', function () {});

      strategy.push(policy);

      assume(strategy).has.length(1);
      assume(strategy.transports[0]).is.instanceOf(Strategy.Policy);
      assume(strategy.transports[0].name).equals('foo');
      assume(strategy.transports[0].id).equals(0);
    });

    it('increments ids', function () {
      assume(strategy.id).equals(0);

      strategy.push('foo', function () {});

      assume(strategy.id).equals(1);
      assume(strategy.transports[0].id).equals(0);

      strategy.push('foo', function () {});
      assume(strategy.id).equals(2);
      assume(strategy.transports[1].id).equals(1);
    });

    it('does not override the id', function () {
      var policy = new Strategy.Policy('foo', function () {});
      policy.id = 'foo';

      strategy.push(policy);

      assume(strategy).has.length(1);
      assume(strategy.transports[0]).is.instanceOf(Strategy.Policy);
      assume(strategy.transports[0].name).equals('foo');
      assume(strategy.transports[0].id).equals('foo');
    });
  });

  describe('#destroy', function () {
    it('returns a boolean', function () {
      assume(strategy.destroy()).is.true();
    });

    it('returns false on second destroy call', function () {
      assume(strategy.destroy()).is.true();
      assume(strategy.destroy()).is.false();
      assume(strategy.destroy()).is.false();
      assume(strategy.destroy()).is.false();
      assume(strategy.destroy()).is.false();
    });
  });
});
