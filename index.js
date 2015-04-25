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

// Source: http://stackoverflow.com/a/18391901

var defaultDiacriticsRemovalap = [
{'base':'A', 'letters':'\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F'},
{'base':'AA','letters':'\uA732'},
{'base':'AE','letters':'\u00C6\u01FC\u01E2'},
{'base':'AO','letters':'\uA734'},
{'base':'AU','letters':'\uA736'},
{'base':'AV','letters':'\uA738\uA73A'},
{'base':'AY','letters':'\uA73C'},
{'base':'B', 'letters':'\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181'},
{'base':'C', 'letters':'\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E'},
{'base':'D', 'letters':'\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779'},
{'base':'DZ','letters':'\u01F1\u01C4'},
{'base':'Dz','letters':'\u01F2\u01C5'},
{'base':'E', 'letters':'\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E'},
{'base':'F', 'letters':'\u0046\u24BB\uFF26\u1E1E\u0191\uA77B'},
{'base':'G', 'letters':'\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E'},
{'base':'H', 'letters':'\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D'},
{'base':'I', 'letters':'\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197'},
{'base':'J', 'letters':'\u004A\u24BF\uFF2A\u0134\u0248'},
{'base':'K', 'letters':'\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2'},
{'base':'L', 'letters':'\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780'},
{'base':'LJ','letters':'\u01C7'},
{'base':'Lj','letters':'\u01C8'},
{'base':'M', 'letters':'\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C'},
{'base':'N', 'letters':'\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4'},
{'base':'NJ','letters':'\u01CA'},
{'base':'Nj','letters':'\u01CB'},
{'base':'O', 'letters':'\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6' +
'\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C'},
{'base':'OI','letters':'\u01A2'},
{'base':'OO','letters':'\uA74E'},
{'base':'OU','letters':'\u0222'},
{'base':'OE','letters':'\u008C\u0152'},
{'base':'oe','letters':'\u009C\u0153'},
{'base':'P', 'letters':'\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754'},
{'base':'Q', 'letters':'\u0051\u24C6\uFF31\uA756\uA758\u024A'},
{'base':'R', 'letters':'\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782'},
{'base':'S', 'letters':'\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784'},
{'base':'T', 'letters':'\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786'},
{'base':'TZ','letters':'\uA728'},
{'base':'U', 'letters':'\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244'},
{'base':'V', 'letters':'\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245'},
{'base':'VY','letters':'\uA760'},
{'base':'W', 'letters':'\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72'},
{'base':'X', 'letters':'\u0058\u24CD\uFF38\u1E8A\u1E8C'},
{'base':'Y', 'letters':'\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE'},
{'base':'Z', 'letters':'\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762'},
{'base':'a', 'letters':'\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250'},
{'base':'aa','letters':'\uA733'},
{'base':'ae','letters':'\u00E6\u01FD\u01E3'},
{'base':'ao','letters':'\uA735'},
{'base':'au','letters':'\uA737'},
{'base':'av','letters':'\uA739\uA73B'},
{'base':'ay','letters':'\uA73D'},
{'base':'b', 'letters':'\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253'},
{'base':'c', 'letters':'\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184'},
{'base':'d', 'letters':'\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A'},
{'base':'dz','letters':'\u01F3\u01C6'},
{'base':'e', 'letters':'\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD'},
{'base':'f', 'letters':'\u0066\u24D5\uFF46\u1E1F\u0192\uA77C'},
{'base':'g', 'letters':'\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F'},
{'base':'h', 'letters':'\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265'},
{'base':'hv','letters':'\u0195'},
{'base':'i', 'letters':'\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'},
{'base':'j', 'letters':'\u006A\u24D9\uFF4A\u0135\u01F0\u0249'},
{'base':'k', 'letters':'\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3'},
{'base':'l', 'letters':'\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747'},
{'base':'lj','letters':'\u01C9'},
{'base':'m', 'letters':'\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F'},
{'base':'n', 'letters':'\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5'},
{'base':'nj','letters':'\u01CC'},
{'base':'o', 'letters':'\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B' +
'\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275'},
{'base':'oi','letters':'\u01A3'},
{'base':'ou','letters':'\u0223'},
{'base':'oo','letters':'\uA74F'},
{'base':'p','letters':'\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755'},
{'base':'q','letters':'\u0071\u24E0\uFF51\u024B\uA757\uA759'},
{'base':'r','letters':'\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783'},
{'base':'s','letters':'\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B'},
{'base':'t','letters':'\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787'},
{'base':'tz','letters':'\uA729'},
{'base':'u','letters': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'},
{'base':'v','letters':'\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C'},
{'base':'vy','letters':'\uA761'},
{'base':'w','letters':'\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73'},
{'base':'x','letters':'\u0078\u24E7\uFF58\u1E8B\u1E8D'},
{'base':'y','letters':'\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF'},
{'base':'z','letters':'\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'}
];

var diacriticsMap = {};
for (var i = 0; i < defaultDiacriticsRemovalap.length; i++) {
  var letters = defaultDiacriticsRemovalap[i].letters.split('');
  for (var j = 0; j < letters.length; j++){
    diacriticsMap[letters[j]] = defaultDiacriticsRemovalap[i].base;
  }
}

util.removeDiacritics = function(str) {
  return str.replace(/[^\u0000-\u007E]/g, function(a) {
    return diacriticsMap[a] || a;
  });
};

util.makeSortKey = function() {
  var inputs = Array.prototype.slice.call(arguments);
  if (_.every(inputs, function(input) { return input == null; })) return;
  inputs = inputs.join('');
  return util.removeDiacritics(inputs).toLowerCase();
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
