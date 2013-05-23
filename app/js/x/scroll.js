/* global jj */
(jj.define('jj.scroll', [ ], function (require, exports, module, global) {
    'use strict';

    //-------------------------------------------------------------

    var _DEBUG = !!global._DEBUG,
        g_doc = global.document,
        CLASS_SCROLL = 'jj-scroll',
        scrolls = {};

    //-------------------------------------------------------------

    function initScroll(node) {
        /* jshint newcap:false */
        var scroll = new iScroll(node);
        /* jshint newcap:true */
        scrolls[node.id] = scroll;

        var containingPage = node.parentElement;
        while(containingPage.className.indexOf('jj-page') >= 0) {
            containingPage = containingPage.parentElement;
            if (containingPage === null) {
                break;
            }
        }
        if (containingPage) {
            containingPage.addEventListener('jjpagebeforeshow', function (evt) {
                if (evt.target === parent) {
                  _DEBUG && console.log('jjpagebeforeshow with scoll child');
                    scroll.refresh();
                }
            }, false);
            containingPage.addEventListener('jjpagebeforehide', function (evt) {
                if (evt.target === parent) {
                  _DEBUG && console.log('jjpagebeforehide with scoll child');
                  // do something?
                }
            }, false);
        }
    }

    function destroyScroll(scroll) {
        scroll.destroy();
        delete scrolls[scroll.id];
    }

    function destroy() {
        jj.each(scrolls, destroyScroll);
    }

    function init(base) {
        jj.each((base || g_doc).getElementsByClassName(CLASS_SCROLL), initScroll);
    }

    jj(exports)
        .property('scrolls', function () { return scrolls; })
        .method('scroll', function (id) { return scrolls[id]; })
        .method('initScroll', initScroll)
        .method('init', init)
        .end();
}));

