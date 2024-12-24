export const enum ShapeFlags {
  ELEMENT = 1, // 元素
  FUNCTIONAL_COMPONENT = 1 << 1, // 函数式组件
  STATEFUL_COMPONENT = 1 << 2, // 普通状态组件
  TEXT_CHILDREN = 1 << 3, // 元素的儿子是文本
  ARRAY_CHILDREN = 1 << 4, // 元素的儿子是数组
  SLOTS_CHILDREN = 1 << 5, // 组件的插槽
  TELEPORT = 1 << 6, // 传送门组件
  SUSPENSE = 1 << 7, // 异步加载组件
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // keep-alive相关
  COMPONENT_KEPT_ALIVE = 1 << 9,
  // 组件
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT,
}
