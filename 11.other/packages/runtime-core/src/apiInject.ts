// 在组件定义的时候 父 provides  子 父的provides  孙子 儿子的provides
// 所谓的继承都是儿子 继承老子的，不能父亲继承儿子的
// 如果儿子新增了一个属性 那么我就基于父亲的provides来创建一个新对象，这样不会影响父亲的provides
import { getCurrentInstance } from "./component";
//爷爷 provdes 父 provides  子 (provides:父的provides + 自己)  孙子 儿子的provides
// 原型链
export const provide = (key, value) => {
  // 需要再组件中使用provide和inject
  const instance = getCurrentInstance();
  if (!instance) {
    return;
  }
  let parentPrvoides = instance.parent && instance.parent.provides;
  // 当我第一次调用provide之前的 我的provides 和父亲的肯定是同一个
  if (parentPrvoides === instance.provides) {
    // 基于父亲的构建一个新的
    instance.provides = Object.create(parentPrvoides);
  }
  // 在组件中才可以使用
  instance.provides[key] = value; // 给自己上面新增属性
};

export const inject = (key, defaultVal) => {
  const instance = getCurrentInstance();
  if (!instance) {
    return;
  }
  const provides = instance.parent.provides;
  if (provides && key in provides) {
    return provides[key];
  } else {
    return defaultVal;
  }
};
