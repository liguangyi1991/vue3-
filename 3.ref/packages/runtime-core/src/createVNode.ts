import { isString, ShapeFlags } from "@vue/shared";

export function isVNode(value) {
  return !!value.__v_isVNode; // 用来判断是否是虚拟节点
}

export function createVNode(type, props, children = null) {
  // 虚拟节点需要有一些重要的属性
  const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0;
  const vnode = {
    __v_isVNode: true, // 判断对象是不是虚拟节点可以采用这个字段
    type,
    props,
    children,
    key: props?.key, // 虚拟节点的key，主要用于diff算法
    el: null, // 虚拟节点对应的真实节点
    shapeFlag,
  };
  if (children) {
    let type = 0;
    if (Array.isArray(children)) {
      // 自己是元素，儿子是数组
      type = ShapeFlags.ARRAY_CHILDREN;
    } else {
      vnode.children = String(children);
      type = ShapeFlags.TEXT_CHILDREN;
    }
    vnode.shapeFlag |= type;
  }

  // 这里返回了虚拟节点，并且标识了虚拟节点的类型
  return vnode;
}

// 靠位运算  &  按位与都是1就是1  | 按位或 有一个是1就是1

/* 权限的组合可以采用 | 的方式
001  = 1  用户
010  = 2  管理员
100  = 4  超级管理员



人 -》 001 |  010  -> 011


011 & 001  > 0 说明包含用户
011 & 010  > 0 说明包含管理员
011 & 100  = 0 不包含管理员

*/
