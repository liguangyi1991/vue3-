import { isObject } from "@vue/shared";
import { createVNode, isVNode } from "./createVNode";

export function h(type, propsOrChildren?, children?) {
  const l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        // 是儿子的情况
        return createVNode(type, null, [propsOrChildren]);
      }
      // 是属性的情况
      return createVNode(type, propsOrChildren);
    } else {
      // 可能是数组 也可能是文本  -》 儿子
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    }
    if (l === 3 && isVNode(children)) {
      children = [children];
    }
    // 参数大于3 前两个之外的都是儿子
    // 等于三的情况，第三个参数是虚拟节点，要包装成数组
    return createVNode(type, propsOrChildren, children);
  }
}
