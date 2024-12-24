import { isObject } from "@vue/shared";
import { trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

export function isRef(value) {
  return !!(value && value.__v_isRef);
}

export function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
// ref 处理的是基本类型

class RefImpl {
  public _value;
  public dep = new Set();
  public __v_isRef = true;
  constructor(public rawValue) {
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
}
export function ref(value) {
  return new RefImpl(value);
}
