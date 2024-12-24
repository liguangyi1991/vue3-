export const nodeOps = {
  // 创建元素
  createElement(element) {
    return document.createElement(element);
  },
  // 创建文本
  createText(text) {
    return document.createTextNode(text);
  },
  // 对元素的插入
  insert(element, container, anchor = null) {
    // appendChild(element) = inserBefore(element,null)
    container.inserBefore(element, anchor);
  },
  // 对元素的删除
  remove(child) {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },
  // 元素查询
  querySelector(selector) {
    return document.querySelector(selector);
  },
  // 设置文本内容  innerHTML
  setElementText(element, text) {
    element.textContent = text; // 设置元素的内容
  },
  setText(textNode, text) {
    textNode.nodeValue = text;
  },
  createComment: (text) => document.createComment(text),
  nextSibling: (node) => node.nextSibling,
  parentNode: (node) => node.parentNode,
};
