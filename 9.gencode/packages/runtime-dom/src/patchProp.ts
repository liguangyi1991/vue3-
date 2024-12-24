import { patchAttr } from "./modules/attr";
import { patchClass } from "./modules/class";
import { patchEvent } from "./modules/event";
import { patchStyle } from "./modules/style";

export function patchProp(el, key, prevVal, nextVal) {
  // class 、 style 、 事件 、 普通属性 （表单属性 true-value）

  if (key === "class") {
    patchClass(el, nextVal); // 对类名的处理
  } else if (key === "style") {
    // 如何比较两个对象的差异呢？
    patchStyle(el, prevVal, nextVal);

    // onClick
    // onMousedown
  } else if (/^on[^a-z]/.test(key)) {
    // onClick ()=>{}
    patchEvent(el, key, nextVal);
  } else {
    patchAttr(el, key, nextVal);
  }

  // 根据preVal 和 nextVal 做diff 来更新
  // {color:red}  {background:red}
  // {color:red}  null
  // null  {color:red}

  //  class="a b c"  class="b c"
}
