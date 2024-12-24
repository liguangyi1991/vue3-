import { ShapeFlags } from "@vue/shared";
import { reactive, ReactiveEffect } from "@vue/reactivity";
import { Fragment, isSameVnode, Text } from "./createVNode";
import "./seq";
import { getSeq } from "./seq";
export function createRenderer(renderOptions) {
  const {
    createElement: hostCreateElement,
    createText: hostCreateText,
    remove: hostRemove,
    querySelector: hostQuerySelector,
    setElementText: hostSetElementText,
    setText: hostSetText,
    insert: hostInsert,
    createComment: hostCreateComment,
    nextSibling: hostNextSibling,
    parentNode: hostParentNode,
    patchProp: hostPatchProp,
  } = renderOptions; // 这些方法和某个平台无关

  // ['abc','bced']
  const mountChildren = (children, container) => {
    children.forEach((child) => {
      patch(null, child, container);
    });
  };
  const unmountChildren = (children) => {
    children.forEach((child) => {
      unmount(child);
    });
  };
  const unmount = (vnode) => {
    const { shapeFlag, type, children } = vnode;

    if (type === Fragment) {
      return unmountChildren(children);
    }
    // if (shapeFlag & ShapeFlags.ELEMENT) {
    hostRemove(vnode.el); // 对于元素来说 直接删除dom即可
    // }
  };
  const mountElement = (vnode, container, anchor) => {
    // 递归遍历 虚拟节点将其转换成真实节点

    const { type, props, children, shapeFlag } = vnode;
    const el = (vnode.el = hostCreateElement(type));

    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (children) {
      if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(el, children);
      } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // ['123','abc']  / [h(),h()]
        mountChildren(children, el);
      }
    }
    hostInsert(el, container, anchor);
  };
  const patchProps = (oldProps, newProps, el) => {
    if (oldProps == newProps) return;

    for (let key in newProps) {
      // 真实操作dom
      let prevVal = oldProps[key];
      let nextVal = newProps[key];

      if (prevVal !== nextVal) {
        hostPatchProp(el, key, prevVal, nextVal);
      }
    }

    for (let key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  };
  const patchKeydChildren = (c1, c2, el) => {
    // vue3 中的diff算法  1） 同序列挂载和卸载   2） 最长递增子序列 计算最小偏移量来进行更新
    // 对diff算法进行优化的 , 先从前面比，在从后面比，这样可以确定，变化的部分
    //  a b    c d
    //  a b   e f   c  d

    let i = 0; // 开头的位置

    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    //  a b c
    //  a b d
    // sync from start
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      i++;
    }

    // sync from end

    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    // abc
    // abcde
    // i = 3 e1 = 2 e2 = 4  c2[e2 + 1] == null 说明是向后插入

    //   abc
    // deabc
    // i = 0 e1 = -1 e2 = 1

    // c2[e2 + 1] = a  a就是参照物

    if (i > e1) {
      // 新的多老的少
      while (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = c2[nextPos]?.el; // 获取下一个元素的el
        // 我得知道是向前插入 还是向后插入，如果是向前插入得有参照物
        patch(null, c2[i], el, anchor);
        i++;
      }
    } else if (i > e2) {
      // 老的多，新的少
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    }
    // abcde
    // abc
    // i =3 e1 = 4 e2 =2
    // deabc
    //   abc
    // i =0 e1 = 1 e2 =-1

    // --- 以上的情况 就是一些头尾的特殊操作，但是不适用其他情况----

    let s1 = i;
    let s2 = i;

    console.log(s1, s2, e1, e2); // 2 2 4 5

    // s1 - e1 [c d e]
    // s2 - e2 [d c e h]  // 这个其实不用移动 c和e只需要将d插入到c的前面 并且追加h就可以
    // 4 3 5  -> 4 5 /  3 5
    const keyToNewIndexMap = new Map();

    const toBePatched = e2 - s2 + 1; // 新的儿子有这个么多个需要被patch

    const newIndexToOldIndex = new Array(toBePatched).fill(0);

    for (let i = s2; i <= e2; i++) {
      keyToNewIndexMap.set(c2[i].key, i);
    }

    for (let i = s1; i <= e1; i++) {
      const vnode = c1[i];
      let newIndex = keyToNewIndexMap.get(vnode.key);
      if (newIndex == undefined) {
        // 老的里面有的新的没用
        unmount(vnode);
      } else {
        // 让被patched过的索引用老节点的索引作为标识，防止出现0的情况 + 1
        newIndexToOldIndex[newIndex - s2] = i + 1;
        // 用老的虚拟节点 c和新的虚拟节点做比对
        patch(vnode, c2[newIndex], el); // 这里只是比较自己的属性和儿子，并没有移动
      }
    }

    // a b c d e
    // c a b d f

    // [3,7,9,2, 8,10]  根据数组中的值求出 对应递增子序列的索引，当倒叙插入的时候跳过对应的索引即可
    // [0,1,2,5]
    // console.log(newIndexToOldIndex); // [4,3,5,0]  【1 2】

    const increasingNewIndexSequence = getSeq(newIndexToOldIndex);
    let j = increasingNewIndexSequence.length - 1; // 取出数组的最后一个索引
    // 考虑移动问题、和新的有老的没有问题
    // 采用倒叙插入的方式 进行移动节点。 0 就是新增的
    //  a b[c d e]   f g
    //  a b[d c e h] f g   ->  [3,2,4,0] 这个数组可以用于标识哪些节点被patch过了
    // dom操作 只能向某个元素前面插入 insertBefore
    // h f
    // e h f
    // c e h f
    // d c e h f
    for (let i = toBePatched - 1; i >= 0; i--) {
      const curIndex = s2 + i;
      const curNode = c2[curIndex];
      const anchor = c2[curIndex + 1]?.el; // 取到了f 参照物
      if (newIndexToOldIndex[i] == 0) {
        // h 新的里面没有没法直接插入
        patch(null, curNode, el, anchor);
      } else {
        // 已经有这个元素了直接做插入

        // 这里需要判断 当前i 和 j如果一致说明这一项不需要移动
        if (i == increasingNewIndexSequence[j]) {
          // 如果当前这一项和 序列中相等，说明不用做任何操作，直接跳过即可
          j--;
        } else {
          hostInsert(curNode.el, el, anchor); // 不在序列中意味着此元素需要移动
        }
      }
    }
  };
  // 比较双方的儿子节点的差异
  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children;
    const c2 = n2.children;

    const prevShapeFlag = n1.shapeFlag; // 之前的形状
    const shapeFlag = n2.shapeFlag; // 之后的形状

    // 当前是文本呢   之前就是 空、文本、数组
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // hello   = [span,span]
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 老的是数组 ， 都移除即可
        unmountChildren(c1);
      }
      // 新的是文本 老的可能是文本、或者空
      if (c1 !== c2) {
        hostSetElementText(el, c2);
      }
      // ---3---
    } else {
      // 之前是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 双方都是数组   核心diff算法  ?? todo,,,

          patchKeydChildren(c1, c2, el);
        } else {
          // 现在是空的情况
          unmountChildren(c1);
        }
      } else {
        // 老的是文本 或者空
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, "");
        }
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el);
        }
      }
      // ---4--
    }

    // 老的是空  新的是文本  x
    // 老的儿子是文本  新的儿子是文本x
    // 老的是数组 新的是文本  x
    // 老的是数组  新的也是数组 x
    // 老的有数组  新的没儿子 x
    // 老的是文本  新的没儿子 x
    // 老的儿子是文本 新的是数组 x
    // -----2--
    // 老的为空  新的是数组 x
    // 新的老的都没儿子 x

    // text null [] * 3
    // 全量diff算法  全量diff 就是从根开始比 ，比到最终的子节点
    // 递归先序 深度遍历  （全量diff 比较消耗性能，有些节点不需要diff） vue3 中有一种靶向更新的方式
    // 可以只比较动态节点
    // div;      div;
    // span;     span;
    // a;        a;
    // b;        b;
    // div       div
    // patchFlag + blockTree 编译优化 只有写模板的时候 才享受这种优化
  };
  const patchElement = (n1, n2) => {
    let el = (n2.el = n1.el); // 将老的虚拟节点上的dom直接给新的虚拟节点
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    // 比较前后属性的差异 diff prop
    patchProps(oldProps, newProps, el);
    patchChildren(n1, n2, el);
  };
  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      mountElement(n2, container, anchor);
    } else {
      // 元素更新了, 属性变化。 更新属性
      patchElement(n1, n2);
    }
  };
  const processText = (n1, n2, el) => {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), el);
    } else {
      let el = (n2.el = n1.el); // 复用文本

      if (n1.children === n2.children) {
        return;
      }
      hostSetText(el, n2.children);
    }
  };
  const processFragment = (n1, n2, el) => {
    if (n1 == null) {
      mountChildren(n2.children, el);
    } else {
      patchKeydChildren(n1.children, n2.children, el);
    }
  };

  const updateComponent = (n1, n2, el, anchor) => {};
  const mountComponent = (n2, el, anchor) => {
    // 组件的数据和渲染函数
    const { data = () => ({}), render } = n2.type;

    const state = reactive(data()); // 获取的数据; 将数据变成响应式的

    // getCurrentInstance
    const instance = {
      state,
      isMounted: false, // 默认组件没有初始化，初始化后会将此属性isMounted true
      subTree: null, // 要渲染的子树的虚拟节点
      vnode: n2, // 组件的虚拟节点
      update: null,
    }; // 此实例就是用来继续组件的属性的，相关信息的

    const componentUpdateFn = () => {
      // 组件要渲染的 虚拟节点是render函数返回的结果
      // 组件有自己的虚拟节点，返回的虚拟节点 subTree
      if (!instance.isMounted) {
        const subTree = render.call(state, state); // 这里先暂且将proxy 设置为状态
        patch(null, subTree, el, anchor);
        instance.subTree = subTree; // 记录第一次的subTree
        instance.isMounted = true;
      } else {
        const prevSubTree = instance.subTree;
        const nextSubTree = render.call(state, state);
        instance.subTree = nextSubTree;
        patch(prevSubTree, nextSubTree, el, anchor);
      }
      // 当调用render方法的时候 会触发响应式的数据访问，进行effect的收集
      // 所以数据变化后会重新触发effect执行
    };
    const effect = new ReactiveEffect(componentUpdateFn); // 对应的effect方法
    const update = (instance.update = effect.run.bind(effect));
    update();
  };
  const processComponent = (n1, n2, el, anchor) => {
    if (n1 == null) {
      mountComponent(n2, el, anchor);
    } else {
      updateComponent(n1, n2, el, anchor); // 组件的属性变化了,或者插槽变化了
    }
  };
  const patch = (n1, n2, container, anchor = null) => {
    // 初次渲染 n1的结果就是null， 如果是更新 n1,n2 都有值
    // 更新和初次渲染

    // n1 和 n2 就不是同一个元素  key 或者标签不一样

    if (n1 && !isSameVnode(n1, n2)) {
      // 得是更新
      unmount(n1);
      n1 = null;
    }
    const { type, shapeFlag } = n2;

    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 元素的处理
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor);
        }
    }
  };

  const render = (vnode, container) => {
    // 虚拟节点的创建 最终生成真实dom渲染到容器中
    // 1) 卸载  render(null,app)
    // 2) 更新 之前渲染过了， 现在在渲染  之前渲染过一次 产生了虚拟节点 ， 再次渲染产生了虚拟节点
    // 3) 初次挂载
    // patch

    if (vnode == null) {
      // 卸载逻辑

      if (container._vnode) {
        // 说明之前渲染过了，现在要移除掉
        unmount(container._vnode); // 虚拟节点中存放了真实节点
      }
    } else {
      patch(container._vnode || null, vnode, container); // 。。。
    }
    container._vnode = vnode;
  };

  return {
    render,
  };
}

// runtime-core中的createRenderer是不基于平台
