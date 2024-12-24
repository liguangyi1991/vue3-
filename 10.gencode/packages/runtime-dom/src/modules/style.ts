export function patchStyle(el, prevVal, nextVal) {
  const style = el.style; // 最终的操作就是他
  if (nextVal) {
    // 这些一定是要生效的
    for (let key in nextVal) {
      style[key] = nextVal[key]; // 用新的样式直接添加即可
    }
  }
  if (prevVal) {
    for (let key in prevVal) {
      if (nextVal[key] == null) {
        style[key] = null; // 删除老对象中的样式即可
      }
    }
  }
}
