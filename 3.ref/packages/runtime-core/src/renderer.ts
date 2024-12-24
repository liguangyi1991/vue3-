export function createRenderer(renderOptions) {
  const {
    createElement: hostCreateElement,
    CreateText: hostCreateText,
    remove: hostRemove,
    querySelector: hostQuerySelector,
    setElementText: hostSetElementText,
    setText: hostSetText,
    createComment: hostCreateComment,
    nextSibling: hostNextSibling,
    parentNode: hostParentNode,
    patchProp: hostPatchProp,
  } = renderOptions; // 这些方法和某个平台无关

  const render = (vnode, container) => {
    // 虚拟节点的创建 最终生成真实dom渲染到容器中
    console.log(vnode, container);
  };
  return {
    render,
  };
}

// runtime-core中的createRenderer是不基于平台
