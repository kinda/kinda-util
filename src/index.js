'use strict';

let _ = require('lodash');
let base64url = require('base64url');
let KindaClass = require('kinda-class');

let KindaUtil = KindaClass.extend('KindaUtil', function() {
  this.getEnvironment = function() {
    return (
      process.env.NODE_ENV ||
      (typeof window !== 'undefined' && window.BROWSER_ENVIRONMENT) ||
      'development'
    );
  };

  this.makeSortKey = function(...inputs) {
    inputs = inputs.join('');
    return _.deburr(inputs).toLowerCase();
  };

  // 'WOW' => 'WOW'
  // 3 => 'num!3'
  // true => 'bool!1'
  this.encodeValue = function(val) {
    if (val == null) {
      return val;
    } else if (_.isBoolean(val)) {
      return 'bool!' + (val ? '1' : '0');
    } else if (_.isNumber(val)) {
      return 'num!' + val;
    } else if (_.isString(val)) {
      return val;
    } else if (_.isArray(val)) {
      return val.map(this.encodeValue, this);
    } else if (_.isPlainObject(val)) {
      return _.mapValues(val, this.encodeValue, this);
    } else {
      throw new Error('unsupported type');
    }
  };

  this.decodeValue = function(val) {
    if (_.isString(val)) {
      if (val === 'bool!0') {
        return false;
      } else if (val === 'bool!1') {
        return true;
      } else if (_.startsWith(val, 'num!')) {
        return Number(val.substr('num!'.length));
      } else {
        return val;
      }
    } else if (_.isArray(val)) {
      return val.map(this.decodeValue, this);
    } else if (_.isPlainObject(val)) {
      return _.mapValues(val, this.decodeValue, this);
    } else {
      throw new Error('invalid encoded value');
    }
  };

  this.encodeURIParameter = function(obj) {
    let str = JSON.stringify(obj);
    str = base64url(str);
    return str;
  };

  this.decodeURIParameter = function(str) {
    str = base64url.decode(str);
    let obj = JSON.parse(str);
    return obj;
  };

  // { id: '123', user: { email: 'mvila@3base.com' } }
  // => { id: '123', 'user.email': 'mvila@3base.com' }
  this.flattenObject = function(obj, parentPath) {
    let result = {};
    _.forOwn(obj, function(val, key) {
      let path = key;
      if (parentPath) path = parentPath + path;
      if (_.isPlainObject(val)) {
        _.assign(result, this.flattenObject(val, path + '.'));
      } else {
        result[path] = val;
      }
    }, this);
    return result;
  };

  // { id: '123', 'user.email': 'mvila@3base.com' }
  // => { id: '123', user: { email: 'mvila@3base.com' } }
  this.expandObject = function(obj) {
    let result = {};
    _.forOwn(obj, function(val, key) {
      let keys = key.split('.');
      key = keys.pop();
      let base = result;
      keys.forEach(function(k) {
        if (!base.hasOwnProperty(k)) base[k] = {};
        base = base[k];
      });
      base[key] = val;
    }, this);
    return result;
  };

  this.getUnixTimestamp = function(date = new Date()) {
    return Math.round(date.getTime() / 1000);
  };

  this.createTimeout = function(ms) {
    let timeout, cbCaller;
    return {
      start() {
        return function(cb) {
          cbCaller = function() {
            if (!timeout) return;
            timeout = undefined;
            cb();
          };
          timeout = setTimeout(cbCaller, ms);
        };
      },
      stop() {
        clearTimeout(timeout);
        cbCaller();
      }
    };
  };

  this.getFunctionName = function(fn) {
    if (fn.name) return fn.name;
    if (fn.displayName) return fn.displayName;
    let name = fn.toString();
    name = name.substr('function '.length);
    let pos = name.indexOf('(');
    if (pos === -1) {
      name = name.substr(0, pos);
      if (name) return name;
    }
    return 'anonymous';
  };

  this.base64ToArrayBuffer = function(base64) {
    let binaryStr = window.atob(base64);
    let length = binaryStr.length;
    let bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes.buffer;
  };
});

module.exports = KindaUtil;
