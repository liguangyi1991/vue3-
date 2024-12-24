import { ensureArray } from "@vue/shared";

export const Teleport = {
  __isTeleport: true,
  process(n1, n2, container, anchor, internals) {
    // 在遇到这个Teleport 组件的时候vue就不管了
    // 将虚拟节点，容器，参照物给你，你自己去操作
    const { mountChildren, patchChildren, move } = internals;
    if (!n1) {
      // 初始化
      let target = (n2.target = document.querySelector(n2.props.to));
      if (target) {
        n2.children = ensureArray(n2.children);
        mountChildren(n2.children, target);
      }
    } else {
      n1.children = ensureArray(n1.children);
      n2.children = ensureArray(n2.children);
      patchChildren(n1, n2);
      if (n2.props.to !== n1.props.to) {
        let target = (n2.target = document.querySelector(n2.props.to));
        n2.children.forEach((child) => move(child, target));
      }
    }
  },
  remove(vnode) {
    vnode.target.innerHTML = "";
  },
};
export const isTeleport = (val) => {
  return !!val.__isTeleport;
};
