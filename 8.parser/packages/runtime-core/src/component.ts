import { proxyRefs, reactive } from "@vue/reactivity";
import { isFunction, ShapeFlags } from "@vue/shared";
export let curretInstance = null;
export function setCurrentInstance(instance) {
  curretInstance = instance;
}
export function getCurrentInstance() {
  return curretInstance;
}

export function createComponentInstance(n2) {
  // getCurrentInstance
  const instance = {
    state: {},
    isMounted: false, // 默认组件没有初始化，初始化后会将此属性isMounted true
    subTree: null, // 要渲染的子树的虚拟节点
    vnode: n2, // 组件的虚拟节点
    update: null,
    attrs: {},
    props: {},
    propsOptions: n2.type.props || {}, // 组件中接受的属性
    proxy: null,
    render: null,
    setupState: {},
    exposed: {},
    slots: {}, // 存储当前组件提供的插槽
  }; // 此实例就是用来继续组件的属性的，相关信息的
  return instance;
}
const publicProperties = {
  $attrs: (i) => i.attrs, // proxy.$attrs().c
  $slots: (i) => i.slots, // proxy.$slots
};
const initProps = (instance, userProps) => {
  const attrs = {};
  const props = {};
  const options = instance.propsOptions || {}; // 组件上接受的props
  if (userProps) {
    for (let key in userProps) {
      // 属性中应该包含属性的校验
      const value = userProps[key];
      if (key in options) {
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    }
  }
  instance.attrs = attrs;
  instance.props = reactive(props);
};
function initSlots(instance, children) {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children;
  }
}
export function setupComponent(instance) {
  const { props, type, children } = instance.vnode; // 组件的虚拟节点

  // 对于组件来说 组件保存的不是el，而是组件的实例, 复用组件的实例
  instance.vnode.component = instance;
  //   实例上props和attrs  n2.props 是组件的虚拟节点的props
  initProps(instance, props); // 用用户传递给虚拟节点的props
  // 初始化插槽
  initSlots(instance, children);

  instance.proxy = new Proxy(instance, {
    get(target, key, receiver) {
      const { state, props, setupState } = target;

      if (key in setupState) {
        return setupState[key];
      }
      if (state && key in state) {
        return state[key];
      } else if (key in props) {
        return props[key];
      }
      let getter = publicProperties[key];
      if (getter) {
        return getter(instance);
      }
    },
    set(target, key, value, receiver) {
      const { state, props, setupState } = target;
      if (key in setupState) {
        setupState[key] = value;
        return true;
      } else if (state && key in state) {
        state[key] = value;
        return true;
      } else if (key in props) {
        console.warn("不允许修改props");
        return false;
      }
      return true;
    },
  });
  let { data, setup, render } = type;

  if (setup) {
    const context = {
      attrs: instance.attrs,
      emit(eventName, ...args) {
        let bindName = `on${eventName[0].toUpperCase()}${eventName.slice(1)}`;
        const handler = instance.attrs[bindName];

        if (handler) {
          let handlers = Array.isArray(handler) ? handler : [handler];
          handlers.forEach((handler) => handler(...args));
        }
      },
      expose(exposed) {
        // 主要用于ref ，通过ref获取组件的时候 在vue里只能获取到组件实例，但是在vue3中如果提供了
        // exposed 则获取的就是exposed属性
        instance.exposed = exposed;
      },
      slots: instance.slots,
    };
    setCurrentInstance(instance);
    const setupResult = setup(instance.props, context); // setup只会在组件初始化的时候走一次 顶替了vue2  created beforeCreate
    setCurrentInstance(null);
    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else {
      instance.setupState = proxyRefs(setupResult); // 将setup的返回值做拆包处理，无需在.value
    }
  }

  if (isFunction(data)) {
    instance.state = reactive(data.call(instance.proxy)); // 获取的数据; 将数据变成响应式的
  }
  if (!instance.render) {
    instance.render = render;
  }
}
