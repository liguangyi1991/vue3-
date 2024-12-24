import { getCurrentInstance } from "./component";
import { h } from "./h";
import { isSameVnode } from "./createVNode";

function nextFrame(cb) {
  requestAnimationFrame(() => {
    requestAnimationFrame(cb); // 确保动画是在下一针执行的，
  });
}

function resolveTransitionProps(rawProps) {
  const {
    name = "v",
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave,
  } = rawProps;

  return {
    onBeforeEnter(el) {
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
      onBeforeEnter && onBeforeEnter(el);
    },
    onEnter(el, done) {
      // 当元素进入的时候 会调用onEnter，这个时候需要执行时传参
      // 如何知道用户有没有写done?
      function resolve() {
        el.classList.remove(enterActiveClass);
        el.classList.remove(enterToClass);
        done && done();
      }
      nextFrame(() => {
        el.classList.remove(enterFromClass); // 下一针移除
        el.classList.add(enterToClass);
        if (!onEnter || onEnter.length <= 1) {
          // 你没有传递done方法，那么我要自己去做这个移除操作
          el.addEventListener("transitionend", resolve);
        }
      });
      onEnter && onEnter(el, resolve);
    },
    onLeave(el, done) {
      function resolve() {
        el.classList.remove(leaveToClass);
        el.classList.remove(leaveActiveClass);
        done && done(); // 节点删除
      }
      el.classList.add(leaveFromClass); // 0  -》 100px
      document.body.offsetWidth; // 触发重绘 保证leaveFromClass 已经被添加上去了
      el.classList.add(leaveActiveClass); // 添加动画
      nextFrame(() => {
        el.classList.remove(leaveFromClass);
        el.classList.add(leaveToClass);

        if (!onLeave || onLeave.length <= 1) {
          // 你没有传递done方法，那么我要自己去做这个移除操作
          el.addEventListener("transitionend", resolve);
        }
      });
      onLeave && onLeave(el, resolve);
    },
  };
}

export function Transition(props, { slots }) {
  // 外层组件可以对props进行处理，处理后交给核心的组件
  return h(BaseTransition, resolveTransitionProps(props), slots);
}
function resolveTransitionHooks(props) {
  const { onBeforeEnter, onLeave, onEnter } = props;
  return {
    beforeEnter(el) {
      onBeforeEnter(el);
    },
    enter(el, done) {
      onEnter(el, done);
    },
    leave(el, remove) {
      onLeave(el, remove); // 当离开完成后，需要删除dom元素
    },
  };
}
const BaseTransition = {
  props: { onBeforeEnter: Function, onEnter: Function, onLeave: Function },
  setup(props, { slots }) {
    const instance = getCurrentInstance();
    return () => {
      const innerChild = slots.default && slots.default();

      const enterHooks = resolveTransitionHooks(props);
      innerChild.transition = enterHooks;
      // 元素进入的时候 就调用对应的钩子就可以了

      let oldInnerChild = instance.subTree; // 老的渲染的内容
      // div -> p

      if (oldInnerChild) {
        if (!isSameVnode(oldInnerChild, innerChild)) {
          const levaingHooks = resolveTransitionHooks(props);
          oldInnerChild.transition = levaingHooks;
        }
      }

      return innerChild;
    };
  },
};
