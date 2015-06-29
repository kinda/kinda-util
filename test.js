'use strict';

let assert = require('chai').assert;
let util = require('./src').create();

suite('KindaUtil', function() {
  test('getEnvironment()', function() {
    assert.strictEqual(util.getEnvironment(), 'test');
  });

  test('getHostName()', function() {
    assert.ok(util.getHostName());
  });

  test('makeSortKey()', function() {
    assert.strictEqual(util.makeSortKey(), '');
    assert.strictEqual(util.makeSortKey(undefined, undefined), '');
    assert.strictEqual(util.makeSortKey(''), '');
    assert.strictEqual(util.makeSortKey('', ''), '');
    assert.strictEqual(util.makeSortKey('Élément'), 'element');
    assert.strictEqual(util.makeSortKey('Jean', 'Durand'), 'jeandurand');
  });

  test('pickAndRename()', function() {
    assert.deepEqual(util.pickAndRename(), {});
    assert.deepEqual(util.pickAndRename(undefined, { 'a': 'a' }), {});
    assert.deepEqual(util.pickAndRename({ a: 1, b: 2 }), {});
    assert.deepEqual(util.pickAndRename({ a: 1, b: 2 }, { 'a': 'a' }), { a: 1 });
    assert.deepEqual(
      util.pickAndRename({ a: 1, b: 2 }, { 'a': 'x', 'b': 'y' }),
      { x: 1, y: 2 }
    );
  });

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

  test('flattenObject()', function() {
    assert.deepEqual(
      util.flattenObject(
        { person: { firstName: 'Jean', lastName: 'Dupont' }, number: 123 }
      ),
      { 'person.firstName': 'Jean', 'person.lastName': 'Dupont', number: 123 }
    );
  });

  test('expandObject()', function() {
    assert.deepEqual(
      util.expandObject(
        { 'person.firstName': 'Jean', 'person.lastName': 'Dupont', number: 123 }
      ),
      { person: { firstName: 'Jean', lastName: 'Dupont' }, number: 123 }
    );
  });
});
