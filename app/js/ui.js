/* global jj */
(jj.define('jj.ui', [ ], function (require, exports, module, global) {
    'use strict';

    //-------------------------------------------------------------

    var _DEBUG = !!global._DEBUG,
        g_doc = global.document,
        g_html = g_doc.documentElement,
        android,
        ios,
        portrait,
        landscape,
        viewportWidth,
        viewportHeight,
        ID_VIEWPORT = 'jj-viewport',
        viewportNode,
        activePage,
        pages = {},
        CSS_PAGE = 'jj-page',
        ATTR_PAGE_TO_PREFIX = 'data-to-',
        CSS_ACTIVE = 'jj-active',
        CSS_FX_OUT = 'jj-fx-out',
        CSS_FX_IN = 'jj-fx-in',
        CSS_FX_PREFIX = 'jj-fx-',
        FX_DEFAULT = 'slide',
        FX_DEFAULT_BACK = 'slide-back',
        FX_NONE = 'none',
        FX_BACK = 'back',
        FX_MODAL = 'modal',
        FX_MODAL_SHOW = 'vslide',
        FX_MODAL_HIDE = 'vslide-back',
        MAX_FX_DURATION = 1000,
        EVENT_PAGE_CREATE = 'jj_page_create',
        EVENT_PAGE_DESTROY = 'jj_page_destroy',
        EVENT_PAGE_BEFORE_SHOW = 'jj_page_before_show',
        EVENT_PAGE_SHOW = 'jj_page_show',
        EVENT_PAGE_HIDE = 'jj_page_hide',
        EVENT_PAGE_AFTER_HIDE = 'jj_page_after_hide',
        SELECTOR_GOTO = '[data-to]',
        ATTR_GOTO_TO = 'data-to',
        ATTR_GOTO_FX = 'data-fx',
        CSS_MODAL = 'jj-modal',
        CSS_SCROLL = 'jj-scroll',
        CSS_BLOCKER = 'jj-blocker',
        blockerNode,
        CSS_LOADING = 'jj-loading',
        DEF_LOADING_MESSAGE = 'Loading...',
        loadingNode;

    function showBlocker() {
        if (!blockerNode) {
            blockerNode = g_doc.createElement('div');
            blockerNode.className = CSS_BLOCKER;
            viewportNode.appendChild(blockerNode);
        }
        blockerNode.style.display = '';
    }

    function hideBlocker() {
        if (blockerNode) {
            blockerNode.style.display = 'none';
        }
    }

    function showLoading(message) {
        if (!loadingNode) {
            loadingNode = g_doc.createElement('div');
            loadingNode.className = CSS_LOADING;
            viewportNode.appendChild(loadingNode);
        }
        loadingNode.innerHTML = '<h1>' + (message || DEF_LOADING_MESSAGE) + '</h1>';
        loadingNode.style.display = 'block';
    }

    function hideLoading() {
        loadingNode.style.display = 'none';
    }

    /**
     *
     * @param {Node} fromNode
     * @param {Node} toNode
     * @param {string} fx
     */
    function changePage(fromNode, toNode, fx) {
        var inFxEnd, outFxEnd, inFxEndFlag, outFxEndFlag;

        if (!fromNode && !toNode) {
            console.warn('both fromNode and toNode is null!');
            return;
        }
        if (fromNode === toNode) {
            console.warn('fromNode is equal toNode to!');
            return;
        }

        // convert fx alias
        switch (fx) {
        case FX_BACK:
            fx = FX_DEFAULT_BACK;
            break;
        case FX_MODAL:
            fx = (toNode) ? FX_MODAL_SHOW : FX_MODAL_HIDE;
            break;
        default:
            fx = fx || FX_DEFAULT;
        }

        fx = CSS_FX_PREFIX + fx;

        // prepare cleanup after page transition

        inFxEnd = function (evt) {
            if (evt) { evt.target.removeEventListener(evt.type, inFxEnd, false); }
            if (inFxEndFlag) { return; } // already ended
            inFxEndFlag = true;
            toNode.className = toNode.className.replace(fx, '').replace(CSS_FX_IN, '').trim() + ' ' + CSS_ACTIVE;
            jj.fireEvent(toNode, EVENT_PAGE_SHOW);
        };

        outFxEnd = function (evt) {
            if (evt) { evt.target.removeEventListener(evt.type, outFxEnd, false); }
            if (outFxEndFlag) { return; } // already ended
            outFxEndFlag = true;
            fromNode.className = fromNode.className.replace(fx, '').replace(CSS_FX_OUT, '').replace(CSS_ACTIVE, '').trim();
            jj.fireEvent(fromNode, EVENT_PAGE_AFTER_HIDE);
        };

        // timer to force page transition to end

        inFxEndFlag =  outFxEndFlag = false;
        setTimeout(function () {
            if (!inFxEndFlag && toNode) {
                if (_DEBUG) { console.log('force page in transition to end: fx=' + fx); }
                inFxEnd();
            }
            if (!outFxEndFlag && fromNode) {
                if (_DEBUG) { console.log('force page out transition to end: fx=' + fx); }
                outFxEnd();
            }
        }, MAX_FX_DURATION);

        // start page transition

        if(toNode) {
            jj.fireEvent(toNode, EVENT_PAGE_BEFORE_SHOW);
            toNode.addEventListener('webkitAnimationEnd', inFxEnd, false);
            toNode.className = (toNode.className + ' ' + CSS_FX_IN + ' ' + fx).trim();
        }

        if(fromNode) {
            jj.fireEvent(fromNode, EVENT_PAGE_HIDE);
            fromNode.addEventListener('webkitAnimationEnd', outFxEnd, false);
            fromNode.className = (fromNode.className + ' ' + CSS_FX_OUT + ' ' + fx).trim();
        }
    }

    // TODO: cleanup!
    function jump(evt) {
        //ex. <button data-to="one" data-fx="back"> to goto page #one
        //ex. <button data-to="two" data-fx="back"> to goto page #three via alias "two"
        //ex. <button data-to=""> for hide modal
        //ex. <page id="one" data-to-two="three">
        var node = event.target,
            to = node.getAttribute(ATTR_GOTO_TO),
            fx = node.getAttribute(ATTR_GOTO_FX),
            toPage;

        if (evt) {
            evt.stopPropagation();
            evt.preventDefault();
        }

        if (to) {
            toPage = pages[to];// || pages[node.getAttribute(ATTR_PAGE_TO_PREFIX + to)];
            if (toPage) {
                if (_DEBUG) { console.log('goto to show page: ' + toPage.id); }
                toPage.show(fx);
            } else {
                console.warn('page not found to goto: ' + to);
            }
        } else {
            if (activePage) {
                if (_DEBUG) { console.log('goto to hide page: ' + activePage.id); }
                activePage.hide(fx);
            } else {
                console.warn('no active page to hide: ' + to);
            }
        }
    }

    /**
     *
     * @class
     * @constructor
     * @param {Node} node
     */
    function Page(node) {
        this.node = node;
        this.id = node.id;
        this.modal = (node.className.indexOf(CSS_MODAL) >= 0);
        this.backPage = null;

        // self reference
        node.page = this;

        // TODO: cleanup!
        node.addEventListener(EVENT_PAGE_SHOW, function () {
            if (jj.nls) {
                jj.nls.updateAll(node);
            }
            if (jj.c) {
                jj.c.updateAll(node);
            }
            // wrap with iscroll
            jj.each(node.getElementsByClassName(CSS_SCROLL), function (scrollNode) {
                if (!node.iscrolls) { node.iscrolls = {}; }
                /* jshint newcap:false */
                node.iscrolls[scrollNode.id] = new iScroll(scrollNode);
                /* jshint newcap:true */
            });
        });

        // TODO: cleanup!
        node.addEventListener(EVENT_PAGE_HIDE, function () {
            // unwrap iscroll
            jj.each(node.getElementsByClassName(CSS_SCROLL), function (scrollNode) {
                if (!node.iscrolls) { return; }
                jj.each(node.iscrolls, function (scroll, scrollId) {
                    scroll.destroy();
                    delete node.iscrolls[scrollId];
                });
                delete node.iscrolls;
            });
        });

        // connect all goto nodes(buttons, links and so on...)
        jj.each(node.querySelectorAll(SELECTOR_GOTO), function (gotoNode) {
            if (gotoNode.jj_bound_flag) { return; }
            gotoNode.jj_bound_flag = true;
            gotoNode.addEventListener((gotoNode.nodeName === 'FORM') ? 'submit' : 'click', jump, false);
        });

        jj.fireEvent(this.node, EVENT_PAGE_CREATE);
    }

    Page.prototype.destroy = function () {
        jj.fireEvent(this.node, EVENT_PAGE_DESTROY);
    };

    Page.prototype.show = function (fx) {
        var fromNode;

        if (activePage === this) {
            console.warn('cant show. already active page: ' + this.id);
            return;
        }

        if (this.modal) {
            if (_DEBUG) { console.log('show modal page: ' + this.id); }
            fromNode = null;
            fx = fx || FX_MODAL;
            showLoading();
        } else {
            if (_DEBUG) { console.log('show page: ' + this.id); }
            fromNode = activePage ? activePage.node : null;
        }

        this.backPage = activePage;
        activePage = this;

        changePage(fromNode, this.node, fx);
    };

    Page.prototype.hide = function (fx) {
        var toNode;

        if (activePage !== this) {
            console.warn('cant hide. not active page: ' + this.id);
            return;
        }

        if (!this.backPage) {
            console.warn('cant hide. no back page: ' + this.id);
            return;
        }

        if (this.modal) {
            if (_DEBUG) { console.log('hide modal page: ' + this.id); }
            hideLoading();
            toNode = null;
            fx = fx || FX_MODAL;
        } else {
            if (_DEBUG) { console.log('hide page: ' + this.id); }
            toNode = this.backPage.node;
        }

        activePage = this.backPage;
        this.backPage = null;

        changePage(this.node, toNode, fx);
    };

    function initPage(pageNode) {
        var page = pages[pageNode.id] = new Page(pageNode);
        return page;
    }

    function initPages(base) {
        jj.each((base || g_doc).getElementsByClassName(CSS_PAGE), function (pageNode) {
            initPage(pageNode);
        });
    }

    function destroyPages() {
        jj.each(pages, function (page, pageId) {
            page.destroy();
            delete pages[pageId];
        });
    }

    function initLayout() {
        var className = g_html.className;

        // remove all existing jj-ui-* classes
        className = className.replace(/jj-ui-[^\s]+/g, '').trim();

        // add viewport-resoution class
        viewportWidth = global.innerWidth;
        viewportHeight = global.innerHeight;
        className += ' jj-ui-' + viewportWidth + 'x' + viewportHeight;

        // add orientation class
        switch(global.orientation) {
        case 0: case 180: portrait = true; break;
        case 90: case -90: portrait = false; break;
        default: portrait = (viewportWidth < viewportHeight);
        }
        landscape = !portrait;
        if (portrait) { className += ' jj-ui-portrait'; }
        if (landscape) { className += ' jj-ui-landscape'; }

        // add platform class
        if (android) { className += ' jj-ui-android'; }
        if (ios) { className += ' jj-ui-ios'; }

        // apply ui classes at once
        g_html.className = className.trim();
        if (_DEBUG) {
            console.log('jj.ui.initLayout: ' + g_html.className);
        }
    }

    function _onhashchange() {
        var hash = location.hash.substring(1),
            page = pages[hash];
        if (_DEBUG) { console.log('onhashchange: ' + hash); }
        if (activePage !== page) {
            page.show(FX_NONE);
        }
    }

    function init() {
        var ua = navigator.userAgent;

        if (_DEBUG) { console.log('init ui module...'); }

        viewportNode = document.getElementById(ID_VIEWPORT);

        android = /Android/.test(ua);
        ios = true;///ios/.test(ua);

        global.addEventListener('resize', initLayout, false);
        global.addEventListener('orientationchange', initLayout, false);

        // enable page navigation by hash
        global.addEventListener('hashchange', _onhashchange, false);

        // avoid dragging on document
        global.addEventListener('touchmove', function (evt) { evt.preventDefault(); }, false);

        initLayout();
        initPages();

        // TODO: cleanup!
        // show start page
        var startPage = (g_doc.getElementsByClassName(CSS_PAGE)[0]).page;
        if (startPage) {
            startPage.show(FX_NONE);
        }
    }

    // auto-init
    jj.ready(init);

    //-------------------------------------------------------------

    jj.def(exports)
        .property('android', function () { return android; })
        .property('ios', function () { return ios; })
        .property('portrait', function () { return portrait; })
        .property('landscape', function () { return landscape; })
        .property('viewportWidth', function () { return viewportWidth; })
        .property('viewportHeight', function () { return viewportHeight; })
        .property('activePage', function () { return activePage; })
        .constant('Page', Page)
        .constant('pages', pages)
        .method('page', function (id) { return pages[id]; })
        .method('showBlocker', showBlocker)
        .method('hideBlocker', hideBlocker)
        .method('showLoading', showLoading)
        .method('hideLoading', hideLoading)
        .method('changePage', changePage)
        .method('initPages', initPages)
        .method('destroyPages', destroyPages)
        .method('init', init)
        .end();
}));
