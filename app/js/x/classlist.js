/* global jj */
(jj.define('jj.x.classlist', [ ], function (require, exports, module, global) {
    'use strict';
    //-------------------------------------------------------------

    function ClassList(node) {
      var classList = node.className.trim().split(/\s+/);

      this.item = function (index) {
        return classList[index];
      };

      this.contains = function (className) {
        return classList.indexOf(className) !== -1;
      };

      this.add = function (className) {
        if (!classList.contains(className)) {
          classList.push(className);
          node.className = classList.toString();
        }
      };

      this.remove = function (className) {
        var index = classList.indexOf(className);
        if (index >= 0) {
          classList.splice(index, 1);
          node.className = classList.toString();
        }
      };

      this.toggle = function (className) {
        if (classList.contains(className)) {
          classList.remove(className);
        } else {
          classList.add(className);
        }
      };

      this.toString = function() {
        return classList.join(' ');
      };
    }

    if(!window.document.documentElement.hasOwnProperty('classList')) {
        Object.defineProperty(HTMLElement.prototype, 'classList', {
            get: function () {
                return new ClassList(this);
            },
            enumerable: true
        });
    }

    //-------------------------------------------------------------
}));
