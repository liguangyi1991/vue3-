import { isObject } from "@vue/shared";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags } from "./reactive";
import { isRef } from "./ref";

export const mutableHandlers = {
  // 这里的receiver 就是proxy
  get(target, key, receiver) {
    // 我们在使用proxy的时候要搭配reflect来使用,用来解决this问题
    // 取值的时候, 让这个属性 和 effect产生关系
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true;
    }
    // 如果在取值的时候发现取出来的值是对象，那么再次进行代理，返回代理后的结果

    if (isRef(target[key])) {
      return target[key].value;
    }

    if (isObject(target[key])) {
      return reactive(target[key]);
    }

    // 做依赖收集 记录属性和当前effect的关系
    const res = Reflect.get(target, key, receiver);
    track(target, key);
    return res;
  },
  set(target, key, value, receiver) {
    // 更新数据
    // 找到这个数学对应的effect让他执行

    let oldValue = target[key];

    const r = Reflect.set(target, key, value, receiver);

    if (oldValue !== value) {
      trigger(target, key, value, oldValue);
    }

    return r;
  },
};
