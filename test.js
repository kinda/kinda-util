"use strict";

var assert = require('chai').assert;
var util = require('./').create();

suite('KindaUtil', function() {
  test('encodeValue()', function() {
    assert.strictEqual(util.encodeValue(undefined), undefined);

    assert.strictEqual(util.encodeValue(false), 'bool!0');
    assert.strictEqual(util.encodeValue(true), 'bool!1');

    assert.strictEqual(util.encodeValue(0), 'num!0');
    assert.strictEqual(util.encodeValue(23), 'num!23');
    assert.strictEqual(util.encodeValue(-2), 'num!-2');
    assert.strictEqual(util.encodeValue(3.14), 'num!3.14');

    assert.strictEqual(util.encodeValue(''), '');
    assert.strictEqual(util.encodeValue('hi'), 'hi');

    assert.deepEqual(util.encodeValue([]), []);
    assert.deepEqual(util.encodeValue([1, 'a']), ['num!1', 'a']);

    assert.deepEqual(util.encodeValue({}), {});
    assert.deepEqual(util.encodeValue({ a: 1, b: true }), { a: 'num!1', b: 'bool!1' });

    assert.deepEqual(
      util.encodeValue([{ a: false }, { b: 'b' }]),
      [{ a: 'bool!0' }, { b: 'b' }]
    );

    assert.deepEqual(
      util.encodeValue({ x: { a: false }, y: { b: 'b' } }),
      { x: { a: 'bool!0' }, y: { b: 'b' } }
    );
  });

  test('decodeValue()', function() {
    assert.strictEqual(util.decodeValue('bool!0'), false);
    assert.strictEqual(util.decodeValue('bool!1'), true);

    assert.strictEqual(util.decodeValue('num!0'), 0);
    assert.strictEqual(util.decodeValue('num!23'), 23);
    assert.strictEqual(util.decodeValue('num!-2'), -2);
    assert.strictEqual(util.decodeValue('num!3.14'), 3.14);

    assert.strictEqual(util.decodeValue(''), '');
    assert.strictEqual(util.decodeValue('hi'), 'hi');

    assert.deepEqual(util.decodeValue([]), []);
    assert.deepEqual(util.decodeValue(['num!1', 'a']), [1, 'a']);


    assert.deepEqual(util.decodeValue({}), {});
    assert.deepEqual(util.decodeValue({ a: 'num!1', b: 'bool!1' }), { a: 1, b: true });

    assert.deepEqual(
      util.decodeValue([{ a: 'bool!0' }, { b: 'b' }]),
      [{ a: false }, { b: 'b' }]
    );

    assert.deepEqual(
      util.decodeValue({ x: { a: 'bool!0' }, y: { b: 'b' } }),
      { x: { a: false }, y: { b: 'b' } }
    );
  });
});
