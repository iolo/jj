(jj.define('jj.x.fastclick', [ ], function (require, exports, module, global) {
    "use strict";
    //-------------------------------------------------------------

    var gdoc = global.document,
        CLASS_FASTCLICK = 'jj-fastclick',
        CLASS_ACTIVE = 'jj-pressed';

    /**
     *
     * @see http://cubiq.org/remove-onclick-delay-on-webkit-for-iphone
     * @see http://code.google.com/mobile/articles/fast_buttons.html
     */
    function applyFastClick(node) {
        var onTouchStart, onTouchMove, onTouchEnd, moved, target;

        if (!global.Touch) { return; }

        onTouchStart = function(evt) {
            evt.preventDefault();
            moved = false;

            target = gdoc.elementFromPoint(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
            if (target.nodeType === 3) {
                target = target.parentNode;
            }
            target.className = (target.className + ' ' + CLASS_ACTIVE).trim();

            node.addEventListener('touchmove', onTouchMove, false);
            node.addEventListener('touchend', onTouchEnd, false);
        };

        onTouchMove =  function(evt) {
            moved = true;
            target.classList = (target.className.replace(CLASS_ACTIVE, '').trim());
        };

        onTouchEnd = function(evt) {
            node.removeEventListener('touchmove', onTouchMove, false);
            node.removeEventListener('touchend', onTouchEnd, false);

            if (!moved && target) {
                evt.stopPropagation();
                target.classList = (target.className.replace(CLASS_ACTIVE, '').trim());
                var clickEvent = gdoc.createEvent('MouseEvents');
                clickEvent.initEvent('click', true, true);
                target.dispatchEvent(clickEvent);
            }

            target = undefined;
        };

        node.addEventListener('touchstart', onTouchStart, false);
    }

    /**
     *
     * @param base
     */
    function applyFastClickAll(base) {
        jj.each(gdoc.getElementsByClassName(CLASS_FASTCLICK), applyFastClick);
    }

    //-------------------------------------------------------------
    jj(exports)
        .constant('applyFastClick', applyFastClick)
        .constant('applyFastClickAll', applyFastClickAll)
        .end();
}));
