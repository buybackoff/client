'use strict';

var get = require('lodash.get');

var retryUtil = require('./retry-util');
var urlUtil = require('./util/url-util');

/**
 * Return a shallow clone of `obj` with all client-only properties removed.
 * Client-only properties are marked by a '$' prefix.
 */
function stripInternalProperties(obj) {
  var result = {};

  for (var k in obj) {
    if (obj.hasOwnProperty(k) && k[0] !== '$') {
      result[k] = obj[k];
    }
  }

  return result;
}


function forEachSorted(obj, iterator, context) {
  var keys = Object.keys(obj).sort();
  for (var i = 0; i < keys.length; i++) {
    iterator.call(context, obj[keys[i]], keys[i]);
  }
  return keys;
}


function serializeValue(v) {
  if (typeof v === 'object') {
    return v instanceof Date ? v.toISOString() : JSON.stringify(v);
  }
  return v;
}


function encodeUriQuery(val) {
  return encodeURIComponent(val).replace(/%20/g, '+');
}


// Serialize an object containing parameters into a form suitable for a query
// string.
//
// This is an almost identical copy of the default Angular parameter serializer
// ($httpParamSerializer), with one important change. In Angular 1.4.x
// semicolons are not encoded in query parameter values. This is a problem for
// us as URIs around the web may well contain semicolons, which our backend will
// then proceed to parse as a delimiter in the query string. To avoid this
// problem we use a very conservative encoder, found above.
function serializeParams(params) {
  if (!params) {
    return '';
  }
  var parts = [];
  forEachSorted(params, function(value, key) {
    if (value === null || typeof value === 'undefined') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function(v) {
        parts.push(encodeUriQuery(key)  + '=' + encodeUriQuery(serializeValue(v)));
      });
    } else {
      parts.push(encodeUriQuery(key) + '=' + encodeUriQuery(serializeValue(value)));
    }
  });

  return parts.join('&');
}

/**
 * Creates a function that will make an API call to a named route.
 *
 * @param $http - The Angular HTTP service
 * @param links - Object or promise for an object mapping named API routes to
 *                URL templates and methods
 * @param route - The dotted path of the named API route (eg. `annotation.create`)
 */
function createAPICall($http, links, route) {
  return function (params, data) {
    return links.then(function (links) {
      var descriptor = get(links, route);
      var url = urlUtil.replaceURLParams(descriptor.url, params);
      var req = {
        data: data ? stripInternalProperties(data) : null,
        method: descriptor.method,
        params: url.params,
        paramSerializer: serializeParams,
        url: url.url,
      };
      return $http(req);
    }).then(function (result) {
      return result.data;
    });
  };
}

/**
 * API client for the Hypothesis REST API.
 *
 * Returns an object that with keys that match the routes in
 * the Hypothesis API (see http://h.readthedocs.io/en/latest/api/).
 */
// @ngInject
function store($http, settings) {
  var links = retryUtil.retryPromiseOperation(function () {
    return $http.get(settings.apiUrl);
  }).then(function (response) {
    return response.data.links;
  });

  return {
    search: createAPICall($http, links, 'search'),
    annotation: {
      create: createAPICall($http, links, 'annotation.create'),
      delete: createAPICall($http, links, 'annotation.delete'),
      get: createAPICall($http, links, 'annotation.read'),
      update: createAPICall($http, links, 'annotation.update'),
    },
  };
}

module.exports = store;
