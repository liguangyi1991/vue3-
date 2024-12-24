// keep-alive 组件拥有一个ctx对象

import { ShapeFlags } from "@vue/shared";
import { onMounted, onUpdated } from "./apiLifecycle";
import { getCurrentInstance } from "./component";

export const isKeepAlive = (vnode) => vnode.type.__v_isKeepAlive; // 表示组件是keep-alive

export const KeepAlive = {
  __v_isKeepAlive: true, // 抽象组件没有实际含义
  props: {
    max: Number,
  },
  setup(props, { slots }) {
    const instance = getCurrentInstance(); // 获取组件实例

    let { move, createElement, unmount } = instance.ctx.renderer;

    let storageContainer = createElement("div"); // 稍后组件卸载的时候我将真实dom移动到这个容器中
    instance.ctx.deactivated = (vnode) => {
      // vnode.el
      move(vnode, storageContainer); // 将节点移入到缓存中
    };
    // insert 方法具备移动性，就是可以把节点移动走
    instance.ctx.activated = (vnode, container, anchor) => {
      // 稍后创建就执行此方法  这个虚拟节点就是缓存后的虚拟
      move(vnode, container, anchor); // 将存储的节点拿回来放入即可
    };

    // max 如果用户提供了max 属性，这个时候要看一下有没超过最大的缓存个数 ，如果超过了，我需要将组件卸载

    // 根据组件的key来进行缓存
    const keys = new Set();
    const cache = new Map(); // 映射表来缓存组件间的关系
    const max = props.max;
    let comp; // 这个是要缓存的组件
    let cachekey;

    function cacheNode() {
      cache.set(cachekey, comp);
    }

    onMounted(cacheNode);
    onUpdated(cacheNode);
    function pruneCache(key) {
      let cacheVnode = cache.get(key);
      keys.delete(key);
      cache.delete(key);

      // 需要根据删除的key 来移除

      if (cacheVnode) {
        let shapeFlag = cacheVnode.shapeFlag;
        if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
          shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE;
        }
        if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
          shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
        }
        cacheVnode.shapeFlag = shapeFlag;
        unmount(cacheVnode, storageContainer);
        // 这里还需要将storageContainer中的节点删除
      }
    }
    return () => {
      let vnode = slots.default(); // 获取最新的插槽来渲染页面
      // 当前这个组件是否需要缓存 include / exclude, 是根据name来缓存的
      const key = vnode.key == null ? vnode.type : vnode.key;
      const cacheVnode = cache.get(key);

      if (cacheVnode) {
        // 如果缓存中有，需要从缓存中拿，而不是再次初始化
        vnode.component = cacheVnode.component;
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE; // 表示这个组件不应该走初始化了,应该走activated逻辑
        keys.delete(key); // 显示出在移除  LRU 先删除 在追加到末尾
        keys.add(key); // 将当前的key 进行缓存
      } else {
        cachekey = key;
        comp = vnode;
        keys.add(key); // 将当前的key 进行缓存
        if (max && keys.size > max) {
          // 超过缓存的最大限制了 ，此时要移除了
          // 如何取set中的第一项？
          pruneCache(keys.values().next().value); // iterator中的迭代器
        }
      }
      // 增加了一个标识此标识意味着这个组件不需要真正的销毁 unmount
      vnode.shapeFlag =
        vnode.shapeFlag | ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
      return vnode;
    };
  },
};
