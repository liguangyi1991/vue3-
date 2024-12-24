// packages/runtime-dom/src/nodeOps.ts
var nodeOps = {
  createElement(element) {
    return document.createElement(element);
  },
  createText(text) {
    return document.createTextNode(text);
  },
  insert(element, container, anchor = null) {
    container.insertBefore(element, anchor);
  },
  remove(child) {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },
  querySelector(selector) {
    return document.querySelector(selector);
  },
  setElementText(element, text) {
    element.textContent = text;
  },
  setText(textNode, text) {
    textNode.nodeValue = text;
  },
  createComment: (text) => document.createComment(text),
  nextSibling: (node) => node.nextSibling,
  parentNode: (node) => node.parentNode
};

// packages/runtime-dom/src/modules/attr.ts
function patchAttr(el, key, nextVal) {
  if (nextVal) {
    el.setAttribute(key, nextVal);
  } else {
    el.removeAttribute(key);
  }
}

// packages/runtime-dom/src/modules/class.ts
function patchClass(el, nextVal) {
  if (nextVal == null) {
    el.removeAttribute("class");
  } else {
    el.className = nextVal;
  }
}

// packages/runtime-dom/src/modules/event.ts
function createInvoker(nextVal) {
  const fn = (e) => fn.value(e);
  fn.value = nextVal;
  return fn;
}
function patchEvent(el, rawName, nextVal) {
  const invokers = el._vei || (el._vei = {});
  let eventName = rawName.slice(2).toLowerCase();
  const exisitingInvoker = invokers[eventName];
  if (nextVal && exisitingInvoker) {
    exisitingInvoker.value = nextVal;
  } else {
    if (nextVal) {
      const invoker = invokers[eventName] = createInvoker(nextVal);
      el.addEventListener(eventName, invoker);
    } else if (exisitingInvoker) {
      el.removeEventListener(eventName, exisitingInvoker);
      invokers[eventName] = null;
    }
  }
}

// packages/runtime-dom/src/modules/style.ts
function patchStyle(el, prevVal, nextVal) {
  const style = el.style;
  if (nextVal) {
    for (let key in nextVal) {
      style[key] = nextVal[key];
    }
  }
  if (prevVal) {
    for (let key in prevVal) {
      if (nextVal[key] == null) {
        style[key] = null;
      }
    }
  }
}

// packages/runtime-dom/src/patchProp.ts
function patchProp(el, key, prevVal, nextVal) {
  if (key === "class") {
    patchClass(el, nextVal);
  } else if (key === "style") {
    patchStyle(el, prevVal, nextVal);
  } else if (/^on[^a-z]/.test(key)) {
    patchEvent(el, key, nextVal);
  } else {
    patchAttr(el, key, nextVal);
  }
}

// packages/shared/src/index.ts
var isObject = (value) => {
  return value != null && typeof value === "object";
};
var isFunction = (value) => {
  return typeof value === "function";
};
function isString(value) {
  return typeof value === "string";
}

// packages/reactivity/src/effect.ts
var activeEffect = void 0;
function cleanupEffect(effect2) {
  const { deps } = effect2;
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect2);
  }
  effect2.deps.length = 0;
}
var ReactiveEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this.parent = void 0;
    this.active = true;
    this.deps = [];
  }
  run() {
    if (!this.active) {
      return this.fn();
    }
    try {
      this.parent = activeEffect;
      activeEffect = this;
      cleanupEffect(this);
      return this.fn();
    } finally {
      activeEffect = this.parent;
      this.parent = void 0;
    }
  }
  stop() {
    if (this.active) {
      this.active = false;
      cleanupEffect(this);
    }
  }
};
function effect(fn, options = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  _effect.run();
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  if (activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, dep = /* @__PURE__ */ new Set());
    }
    trackEffects(dep);
  }
}
function trackEffects(dep) {
  let shouldTrack = !dep.has(activeEffect);
  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}
function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  triggerEffects(dep);
}
function triggerEffects(dep) {
  const effects = [...dep];
  effects && effects.forEach((effect2) => {
    if (effect2 !== activeEffect) {
      if (effect2.scheduler) {
        effect2.scheduler();
      } else {
        effect2.run();
      }
    }
  });
}

// packages/reactivity/src/ref.ts
function isRef(value) {
  return !!(value && value.__v_isRef);
}
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
var RefImpl = class {
  constructor(rawValue) {
    this.rawValue = rawValue;
    this.dep = /* @__PURE__ */ new Set();
    this.__v_isRef = true;
    this._value = toReactive(rawValue);
  }
  get value() {
    trackEffects(this.dep);
    return this._value;
  }
  set value(newVal) {
    if (newVal !== this.rawValue) {
      this.rawValue = newVal;
      this._value = toReactive(newVal);
      triggerEffects(this.dep);
    }
  }
};
function ref(value) {
  return new RefImpl(value);
}
var ObjectRefImpl = class {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
  }
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function toRef(object, key) {
  return new ObjectRefImpl(object, key);
}
function toRefs(object) {
  let ret = Array.isArray(object) ? new Array(object.length) : /* @__PURE__ */ Object.create(null);
  for (let key in object) {
    ret[key] = toRef(object, key);
  }
  return ret;
}
function proxyRefs(object) {
  return new Proxy(object, {
    get(target, key, receiver) {
      debugger;
      let v = Reflect.get(target, key, receiver);
      return isRef(v) ? v.value : v;
    },
    set(target, key, value, receiver) {
      let oldValue = Reflect.get(target, key, receiver);
      if (isRef(oldValue)) {
        oldValue.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    }
  });
}

// packages/reactivity/src/handler.ts
var mutableHandlers = {
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return true;
    }
    if (isRef(target[key])) {
      return target[key].value;
    }
    if (isObject(target[key])) {
      return reactive(target[key]);
    }
    const res = Reflect.get(target, key, receiver);
    track(target, key);
    return res;
  },
  set(target, key, value, receiver) {
    let oldValue = target[key];
    const r = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
    }
    return r;
  }
};

// packages/reactivity/src/reactive.ts
var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
  ReactiveFlags2["IS_REACTIVE"] = "__v_isReactive";
  return ReactiveFlags2;
})(ReactiveFlags || {});
var reactiveMap = /* @__PURE__ */ new WeakMap();
function reactive(target) {
  if (!isObject(target))
    return target;
  let existingProxy = reactiveMap.get(target);
  if (existingProxy)
    return existingProxy;
  if (target["__v_isReactive" /* IS_REACTIVE */]) {
    return target;
  }
  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}
function isReactive(value) {
  return value["__v_isReactive" /* IS_REACTIVE */];
}

// packages/reactivity/src/apiWatch.ts
function traverse(value, seen = /* @__PURE__ */ new Set()) {
  if (!isObject(value)) {
    return value;
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  for (const key in value) {
    traverse(value[key], seen);
  }
  return value;
}
function watch(source, cb, options) {
  return dowatch(source, cb, options);
}
function watchEffect(source, options) {
  return dowatch(source, null, options);
}
function dowatch(source, cb, options) {
  let getter;
  if (isReactive(source)) {
    getter = () => traverse(source);
  } else if (isFunction(source)) {
    getter = source;
  }
  let oldVal;
  let clear;
  let onCleanup = (fn) => {
    clear = fn;
  };
  const job = () => {
    if (cb) {
      if (clear)
        clear();
      const newVal = effect2.run();
      cb(newVal, oldVal, onCleanup);
      oldVal = newVal;
    } else {
      effect2.run();
    }
  };
  const effect2 = new ReactiveEffect(getter, job);
  oldVal = effect2.run();
}

// packages/reactivity/src/computed.ts
var ComputedRefImpl = class {
  constructor(getter, setter) {
    this.setter = setter;
    this._dirty = true;
    this.dep = /* @__PURE__ */ new Set();
    this.__v_isRef = true;
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        triggerEffects(this.dep);
      }
    });
  }
  get value() {
    trackEffects(this.dep);
    if (this._dirty) {
      this._dirty = false;
      this._value = this.effect.run();
    }
    return this._value;
  }
  set value(newVal) {
    this.setter(newVal);
  }
};
function computed(getterOrOptions) {
  let getter;
  let setter;
  const isGetter = isFunction(getterOrOptions);
  if (isGetter) {
    getter = getterOrOptions;
    setter = () => {
      console.log("warn");
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  return new ComputedRefImpl(getter, setter);
}

// packages/runtime-core/src/createVNode.ts
var Text = Symbol();
var Fragment = Symbol();
function isVNode(value) {
  return !!value.__v_isVNode;
}
function isSameVnode(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
function createVNode(type, props, children = null) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : 0;
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    key: props == null ? void 0 : props.key,
    el: null,
    shapeFlag
  };
  if (children) {
    let type2 = 0;
    if (Array.isArray(children)) {
      type2 = 16 /* ARRAY_CHILDREN */;
    } else {
      vnode.children = String(children);
      type2 = 8 /* TEXT_CHILDREN */;
    }
    vnode.shapeFlag |= type2;
  }
  return vnode;
}

// packages/runtime-core/src/seq.ts
function getSeq(arr) {
  const result = [0];
  const len = arr.length;
  const p = arr.slice(0).fill(-1);
  let start;
  let end;
  let middle;
  for (let i2 = 0; i2 < len; i2++) {
    const arrI = arr[i2];
    if (arrI !== 0) {
      let resultLastIndex = result[result.length - 1];
      if (arr[resultLastIndex] < arrI) {
        result.push(i2);
        p[i2] = resultLastIndex;
        continue;
      }
      start = 0;
      end = result.length - 1;
      while (start < end) {
        middle = (start + end) / 2 | 0;
        if (arr[result[middle]] < arrI) {
          start = middle + 1;
        } else {
          end = middle;
        }
      }
      p[i2] = result[start - 1];
      result[start] = i2;
    }
  }
  let i = result.length;
  let last = result[i - 1];
  while (i-- > 0) {
    result[i] = last;
    last = p[last];
  }
  return result;
}

// packages/runtime-core/src/renderer.ts
function createRenderer(renderOptions2) {
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
    patchProp: hostPatchProp
  } = renderOptions2;
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
    hostRemove(vnode.el);
  };
  const mountElement = (vnode, container, anchor) => {
    const { type, props, children, shapeFlag } = vnode;
    const el = vnode.el = hostCreateElement(type);
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (children) {
      if (shapeFlag & 8 /* TEXT_CHILDREN */) {
        hostSetElementText(el, children);
      } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
        mountChildren(children, el);
      }
    }
    hostInsert(el, container, anchor);
  };
  const patchProps = (oldProps, newProps, el) => {
    if (oldProps == newProps)
      return;
    for (let key in newProps) {
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
    var _a, _b;
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
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
    if (i > e1) {
      while (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = (_a = c2[nextPos]) == null ? void 0 : _a.el;
        patch(null, c2[i], el, anchor);
        i++;
      }
    } else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    }
    let s1 = i;
    let s2 = i;
    console.log(s1, s2, e1, e2);
    const keyToNewIndexMap = /* @__PURE__ */ new Map();
    const toBePatched = e2 - s2 + 1;
    const newIndexToOldIndex = new Array(toBePatched).fill(0);
    for (let i2 = s2; i2 <= e2; i2++) {
      keyToNewIndexMap.set(c2[i2].key, i2);
    }
    for (let i2 = s1; i2 <= e1; i2++) {
      const vnode = c1[i2];
      let newIndex = keyToNewIndexMap.get(vnode.key);
      if (newIndex == void 0) {
        unmount(vnode);
      } else {
        newIndexToOldIndex[newIndex - s2] = i2 + 1;
        patch(vnode, c2[newIndex], el);
      }
    }
    const increasingNewIndexSequence = getSeq(newIndexToOldIndex);
    let j = increasingNewIndexSequence.length - 1;
    for (let i2 = toBePatched - 1; i2 >= 0; i2--) {
      const curIndex = s2 + i2;
      const curNode = c2[curIndex];
      const anchor = (_b = c2[curIndex + 1]) == null ? void 0 : _b.el;
      if (newIndexToOldIndex[i2] == 0) {
        patch(null, curNode, el, anchor);
      } else {
        if (i2 == increasingNewIndexSequence[j]) {
          j--;
        } else {
          hostInsert(curNode.el, el, anchor);
        }
      }
    }
  };
  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children;
    const c2 = n2.children;
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        hostSetElementText(el, c2);
      }
    } else {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          patchKeydChildren(c1, c2, el);
        } else {
          unmountChildren(c1);
        }
      } else {
        if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
          hostSetElementText(el, "");
        }
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          mountChildren(c2, el);
        }
      }
    }
  };
  const patchElement = (n1, n2) => {
    let el = n2.el = n1.el;
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    patchProps(oldProps, newProps, el);
    patchChildren(n1, n2, el);
  };
  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      mountElement(n2, container, anchor);
    } else {
      patchElement(n1, n2);
    }
  };
  const processText = (n1, n2, el) => {
    if (n1 == null) {
      hostInsert(n2.el = hostCreateText(n2.children), el);
    } else {
      let el2 = n2.el = n1.el;
      if (n1.children === n2.children) {
        return;
      }
      hostSetText(el2, n2.children);
    }
  };
  const processFragment = (n1, n2, el) => {
    if (n1 == null) {
      mountChildren(n2.children, el);
    } else {
      patchKeydChildren(n1.children, n2.children, el);
    }
  };
  const updateComponent = (n1, n2, el, anchor) => {
  };
  const mountComponent = (n2, el, anchor) => {
    const { data = () => ({}), render: render3 } = n2.type;
    const state = reactive(data());
    const instance = {
      state,
      isMounted: false,
      subTree: null,
      vnode: n2,
      update: null
    };
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        const subTree = render3.call(state, state);
        patch(null, subTree, el, anchor);
        instance.subTree = subTree;
        instance.isMounted = true;
      } else {
        const prevSubTree = instance.subTree;
        const nextSubTree = render3.call(state, state);
        instance.subTree = nextSubTree;
        patch(prevSubTree, nextSubTree, el, anchor);
      }
    };
    const effect2 = new ReactiveEffect(componentUpdateFn);
    const update = instance.update = effect2.run.bind(effect2);
    update();
  };
  const processComponent = (n1, n2, el, anchor) => {
    if (n1 == null) {
      mountComponent(n2, el, anchor);
    } else {
      updateComponent(n1, n2, el, anchor);
    }
  };
  const patch = (n1, n2, container, anchor = null) => {
    if (n1 && !isSameVnode(n1, n2)) {
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
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(n1, n2, container, anchor);
        }
    }
  };
  const render2 = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container);
    }
    container._vnode = vnode;
  };
  return {
    render: render2
  };
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  const l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !Array.isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      return createVNode(type, propsOrChildren);
    } else {
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    }
    if (l === 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}

// packages/runtime-dom/src/index.ts
var renderOptions = Object.assign(nodeOps, { patchProp });
function createRenderer2(renderOptions2) {
  return createRenderer(renderOptions2);
}
function render(vnode, container) {
  const renderer = createRenderer2(renderOptions);
  return renderer.render(vnode, container);
}
export {
  Fragment,
  ReactiveEffect,
  ReactiveFlags,
  Text,
  activeEffect,
  computed,
  createRenderer2 as createRenderer,
  createVNode,
  dowatch,
  effect,
  h,
  isReactive,
  isRef,
  isSameVnode,
  isVNode,
  proxyRefs,
  reactive,
  ref,
  render,
  toReactive,
  toRef,
  toRefs,
  track,
  trackEffects,
  trigger,
  triggerEffects,
  watch,
  watchEffect
};
//# sourceMappingURL=runtime-dom.js.map
