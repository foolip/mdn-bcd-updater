// This harness should work on as old browsers as possible and can't depend on
// any modern JavaScript features.

'use strict';

(function() {
  this.mdn = {};
  window.callback = function callback(obj) {
    console.log(obj);
  };
})();
