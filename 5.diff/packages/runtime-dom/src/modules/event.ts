function createInvoker(nextVal) {
  const fn = (e) => fn.value(e);
  fn.value = nextVal; // 真实的方法，后续修改方法只需要修改fn.value属性即可
  return fn;
}

export function patchEvent(el, rawName, nextVal) {
  // vue event invoker
  const invokers = el._vei || (el._vei = {}); // 缓存列表
  let eventName = rawName.slice(2).toLowerCase();
  // 看一下是否绑定过这个事件
  const exisitingInvoker = invokers[eventName];
  if (nextVal && exisitingInvoker) {
    // 有新值并且绑定过事件，需要换绑操作
    exisitingInvoker.value = nextVal;
  } else {
    // 这里意味着不存在绑定过
    if (nextVal) {
      const invoker = (invokers[eventName] = createInvoker(nextVal));
      el.addEventListener(eventName, invoker);
      // 有没有新的事件
    } else if (exisitingInvoker) {
      // 没有新值，但是之前绑定过事件了
      el.removeEventListener(eventName, exisitingInvoker);
      invokers[eventName] = null;
    }
  }
  // fn1,fn2
  // const fn = ()=>{fn.value()}
  // fn.value = fn2
  // el.addEventListener('click',fn)
}
