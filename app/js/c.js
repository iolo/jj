/* global jj */
/**
 * "Controller" support.
 *
 * @namespace
 * @name jj.c
 * @example
 * <div data-view="view1" data-model="model1"></div>
 * <div id="view1" class="jj-view">...</div>
 * <div id="model1" class="jj-model">...</div>
 */
(jj.define('jj.c', [ 'jj.m', 'jj.v' ], function (require, exports, module, global) {
    "use strict";
    //-------------------------------------------------------------

    var _DEBUG = !!global._DEBUG,
        g_doc = global.document,
        CSS_PLACEHOLDER = 'jj-placeholder',
        ATTR_VIEW = 'data-view',
        ATTR_MODEL = 'data-model',
        EVENT_C_BEFORE_UPDATE = 'jj_c_before_update',
        EVENT_C_AFTER_UPDATE = 'jj_c_after_update';

    //-------------------------------------------------------------

    /**
     * TODO: de-serialize form
     *
     * @param {object} data json object
     * @param {Node} formNode target form node
     */
    function deserialize(data, formNode) {
        jj.each(formNode.elements, function (elementNode) {
            var k = elementNode.name;
            if (k && data.hasOwnProperty(k)) {
                switch (elementNode.type) {
                    case 'checkbox':
                        elementNode.checked = data[k];
                        break;
                    case 'radio':
                        elementNode.checked = (elementNode.value === data[k]);
                        break;
                    default:
                        elementNode.value = data[k];
                        break;
                }
            }
        });
    }

    /**
     * TODO: serialize form
     *
     * @param {Node} formNode source form node
     * @return {object} json object
     */
    function serialize(formNode) {
        var data = {};
        jj.each(formNode.elements, function (elementNode) {
            var k = elementNode.name;
            if (k) {
                switch (elementNode.type) {
                    case 'checkbox':
                        data[k] = elementNode.checked;
                        break;
                    case 'radio':
                        if (elementNode.checked) {
                            data[k] = elementNode.value;
                        }
                        break;
                    default:
                        data[k] = elementNode.value;
                        break;
                }
            }
        });
        return data;
    }

    /**
     *
     * @param {Node} node a placeholder node that receives the merged content
     */
    function updatePlaceholder(node) {
        var viewId = node.getAttribute(ATTR_VIEW),
            modelId = node.getAttribute(ATTR_MODEL),
            view,
            model;

        if (_DEBUG) {
            console.log('update view with model: view=' + viewId + ',model=' + modelId);
        }

        if (viewId) {
            view = jj.v.getView(viewId);
            if (!view) {
                throw new Error('view not found: ' + viewId);
            }
        } else {
            throw new Error('no view id.');
        }

        if (modelId) {
            model = jj.m.getModel(modelId);
            if (!model) {
                throw new Error('model not found: ' + modelId);
            }
        }

        jj.fireEvent(node, EVENT_C_BEFORE_UPDATE);

        view.merge(model, function (content) {
            node.innerHTML = content;
            jj.fireEvent(node, EVENT_C_AFTER_UPDATE);
        });
    }

    /**
     *
     * @param {Node} node
     */
    function updateForm(node) {
        var modelId = node.getAttribute(ATTR_MODEL),
            model = jj.m.getModel(modelId);

        if (model) {
            model.load(function (data) {
                deserialize(data, node);
            });
        }

        if (!node._jj_bound) {
            node._jj_bound = true;
            node.addEventListener('submit', function (evt) {
                if (model) {
                    model.save(serialize(node));
                }
            }, false);
        }
    }

    /**
     * TODO: cleanup
     *
     * @param {Node=} base a base node to search bindable nodes
     */
    function updateAll(base) {
        jj.each((base || g_doc).getElementsByClassName(CSS_PLACEHOLDER), updatePlaceholder);
        jj.each((base || g_doc).querySelectorAll('form[data-model]'), updateForm);
    }

    //-------------------------------------------------------------
    jj.def(exports)
        .method('updatePlaceholder', updatePlaceholder)
        .method('updateForm', updateForm)
        .method('updateAll', updateAll)
        .end();
}));

