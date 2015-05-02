"use strict";

var nodeUtil = require('util');
var _ = require('lodash');
var Promise = require('es6-promise').Promise;
var co = require('co');
var base64url = require('base64url');
var config = require('kinda-config').create();
var tr = require('kinda-translator').create();

var util = {};

util.node = nodeUtil;

util.capitalize = function(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

util.startsWith = function(str, search) {
  return str.substr(0, search.length) === search;
};

util.endsWith = function(str, search) {
  return str.substr(-search.length) === search;
};

util.dasherize = function(str) {
  var upperStr = str.toUpperCase();
  var result = '';
  var withinWord = false;
  for (var i = 0; i < str.length; i++) {
    var char = str[i];
    var upperChar = upperStr[i];
    if (char === upperChar) {
      if (withinWord) {
        result += '-';
        withinWord = false;
      }
      result += char.toLowerCase();
    } else {
      result += char;
      withinWord = true;
    }
  }
  return result;
};

util.camelize = function(input, separator) {
  if (!separator) separator = '-';
  var output = '';
  var index;
  while (input) {
    index = input.indexOf(separator);
    if (index !== -1) {
      output += input.substr(0, index);
      output += input.substr(index + 1, 1).toUpperCase();
      input = input.substr(index + 2);
    } else {
      output += input;
      input = '';
    }
  }
  return output;
};

util.getUnixTimestamp = function(date) {
  if (!date) date = new Date();
  return Math.round(date.getTime()/1000);
};

util.formatNumber = function(number) {
  if (number == null) return undefined;
  if (!_.isNumber(number)) throw new Error("'number' argument is not a Number");
  return tr.numeral(number).format('0[.][00000]');
};

util.parseNumber = function(str) {
  if (!str) return undefined;
  if (!_.isString(str)) throw new Error("'str' argument is not a String");
  return tr.numeral().unformat(str);
};

util.formatDate = function(date, format) {
  if (date == null) return undefined;
  if (!_.isDate(date)) throw new Error("'date' argument is not a Date");
  if (!format) format = 'short';
  if (format === 'short')
    format = tr('kinda-util.dateShortFormat');
  else if (format === 'shortest')
    format = tr('kinda-util.dateShortestFormat');
  else if (format === 'dateAndTimeShort')
    format = tr('kinda-util.dateAndTimeShortFormat');
  else if (format === 'timeShort')
    format = tr('kinda-util.timeShortFormat');
  else
    throw new Error('unknown date format (' + format + ')');
  return tr.moment(date).format(format);
};

util.parseDate = function(str) {
  if (!str) return undefined;
  if (!_.isString(str)) throw new Error("'str' argument is not a String");
  var date = tr.moment(str, tr('kinda-util.dateShortFormat'), true);
  if (date.isValid()) return date.toDate();
  date = tr.moment(str, tr('kinda-util.dateShortFlexibleFormatForParsing'), true);
  if (date.isValid()) return date.toDate();
  return undefined;
};

util.validateDate = function(str) {
  if (!str) return true;
  if (!_.isString(str)) throw new Error("'str' argument is not a String");
  var date = tr.moment(str, tr('kinda-util.dateShortFormat'), true);
  if (date.isValid()) return true;
  date = tr.moment(str, tr('kinda-util.dateShortFlexibleFormatForParsing'), true);
  if (date.isValid()) return true;
  return false;
};

util.formatDateAndTime = function(date) {
  return tr.moment(date).format(tr('kinda-util.dateAndTimeShortFormat'));
};

util.getFunctionName = function(fn) {
  if (fn.name) return fn.name;
  var name = fn.toString();
  name = name.substr('function '.length);
  var pos = name.indexOf('(');
  if (pos === -1) {
    name = name.substr(0, pos);
    if (name) return name;
  }
  return 'anonymousFunction';
};

// 'WOW' => 'WOW'
// 3 => 'num!3'
// true => 'bool!1'
util.encodeValue = function(val) {
  if (_.isUndefined(val)) return;
  if (_.isBoolean(val))
    val = 'bool!' + (val ? '1' : '0');
  else if (_.isNumber(val))
    val = 'num!' + val;
  else if (_.isArray(val))
    val = val.map(util.encodeValue);
  else if (!_.isString(val))
    throw new Error('unsupported type');
  return val;
};

util.encodeObject = function(obj) {
  obj = this.flattenObject(obj);
  var result = {};
  _.forOwn(obj, function(val, key) {
    result[key] = util.encodeValue(val);
  });
  return result;
};

util.decodeValue = function(val) {
  if (_.isString(val)) {
    if (util.startsWith(val, 'bool!')) {
      val = val.substr('bool!'.length);
      val = (val === '1' ? true : false);
    } else if (util.startsWith(val, 'num!')) {
      val = val.substr('num!'.length);
      val = Number(val);
    }
  } else if (_.isArray(val)) {
    val = val.map(util.decodeValue);
  } else
    throw new Error('invalid encoded value');
  return val;
};

util.decodeObject = function(obj) {
  var result = {};
  _.forOwn(obj, function(val, key) {
    result[key] = util.decodeValue(val);
  });
  result = this.expandObject(result);
  return result;
};

util.encodeURIParameter = function(obj) {
  var str = JSON.stringify(obj);
  str = base64url(str);
  return str;
};

util.decodeURIParameter = function(str) {
  str = base64url.decode(str);
  var obj = JSON.parse(str);
  return obj;
};

// { id: '123', user: { email: 'mvila@3base.com' } }
// => { id: '123', 'user.email': 'mvila@3base.com' }
util.flattenObject = function(obj, parentPath) {
  var result = {};
  _.forOwn(obj, function(val, key) {
    var path = key;
    if (parentPath) path = parentPath + path;
    if (_.isPlainObject(val)) {
      _.assign(result, util.flattenObject(val, path + '.'));
    } else {
      result[path] = val;
    }
  });
  return result;
};

// { id: '123', 'user.email': 'mvila@3base.com' }
// => { id: '123', user: { email: 'mvila@3base.com' } }
util.expandObject = function(obj) {
  var result = {};
  _.forOwn(obj, function(val, key) {
    var keys = key.split('.');
    key = keys.pop();
    var base = result;
    keys.forEach(function(key) {
      if (!base.hasOwnProperty(key))
        base[key] = {};
      base = base[key];
    });
    base[key] = val;
  });
  return result;
};

util.joinURLs = function(parent, child) {
  if (!parent) return child;
  if (!child) return parent;
  if (child.substr(0, 7) === 'http://' || child.substr(0, 8) === 'https://')
    return child;
  return parent + '/' + child;
};

util.buildURL = function(template, obj) {
  var url = template;
  _.forOwn(obj, function(val, key) {
    key = '{' + key + '}';
    if (url.indexOf(key) === -1)
      throw new Error('key not found in URL template');
    url = url.replace(key, val);
  });
  return url;
};

// ('{a}/{b}', '1/2') -> { a: '1', b: '2' }
util.parseURL = function(template, url) {
  var obj = {};
  var pos, str, key, val, char;
  while (template.length > 0) {
    pos = template.indexOf('{');
    if (pos === -1) break;
    str = template.substr(0, pos);
    if (url.substr(0, str.length) !== str)
      break; // template and url don't match
    template = template.substr(pos + 1);
    url = url.substr(pos);
    pos = template.indexOf('}');
    if (pos === -1) break;
    key = template.substr(0, pos);
    template = template.substr(pos + 1);
    if (!template) {
      val = url;
    } else {
      char = template.substr(0, 1);
      pos = url.indexOf(char);
      if (pos === -1) break;
      val = url.substr(0, pos);
      url = url.substr(pos);
    }
    obj[key] = val;
  }
  return obj;
};

util.normalizeURLQuery = function(query) {
  var result = {};
  _.forOwn(query, function(val, key) {
    if (val === false) val = 0;
    else if (val === true) val = 1;
    result[key] = val;
  });
  return result;
};

util.promisify = function(fn) {
  console.warn("'util.promisify' is deprecated");
  return co(fn);
};

util.createTimeout = function(ms) {
  var timeout, cbCaller;
  return {
    start: function() {
      return function(cb) {
        cbCaller = function() {
          if (!timeout) return;
          timeout = undefined;
          cb.apply(undefined, arguments);
        };
        timeout = setTimeout(cbCaller, ms);
      };
    },
    stop: function() {
      clearTimeout(timeout);
      cbCaller();
    }
  };
};

util.makeSortKey = function() {
  var inputs = Array.prototype.slice.call(arguments);
  inputs = inputs.join('');
  return _.deburr(inputs).toLowerCase();
};

util.base64ToArrayBuffer = function(base64) {
  var binaryStr =  window.atob(base64);
  var length = binaryStr.length;
  var bytes = new Uint8Array(length);
  for (var i = 0; i < length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

var KindaUtil = {
  create: function() {
    return util;
  }
};

module.exports = KindaUtil;
