'use strict';

var VIA_REFERRER = /^https:\/\/(qa-)?via.hypothes.is\//;

var globalGAOptions = function(win, settings){

  settings = settings || {};

  var globalOpts = {
    category: '',
  };

  var validTypes = ['chrome-extension', 'embed', 'bookmarklet', 'via'];

  // The preferred method for deciding what type of app is running is
  // through the setting of the appType to one of the valid types above.
  // However, we also want to capture
  if(validTypes.indexOf((settings.appType || '').toLowerCase()) > -1){
    globalOpts.category = settings.appType.toLowerCase();
  }else if(win.location.protocol === 'chrome-extension:'){
    globalOpts.category = 'chrome-extension';
  }else if(VIA_REFERRER.test(win.document.referrer)){
    globalOpts.category = 'via';
  }else {
    globalOpts.category = 'embed';
  }

  return globalOpts;
};

/**
 * Analytics api to simplify and standardize the values that we
 * pass to the angularlitcs service.
 *
 * These analytics are based on google analytics and need to conform to its
 * requirements. Specifically, we are required to send the event and a category.
 *
 * We will standardize the category to be the appType of the client settings
 */
// @ngInject
function analytics($analytics, $window, settings) {
  var options = globalGAOptions($window, settings);

  return {
    track: function(event){
      $analytics.eventTrack(event, options);
    },
  };
}

module.exports = analytics;
