import { NodeTypes } from "./ast";

export const TO_DISPLAY_STRING = Symbol("toDisplayString"); // 宏
export const CREATE_TEXT = Symbol("createTextVNode");
export const CREATE_ELEMENT_VNODE = Symbol("createElementVnode");
export const OPEN_BLOCK = Symbol("openBlock");
export const FRAGMENT = Symbol("fragment");
export const CREATE_ELEMENT_BLOCK = Symbol("createElementBlock");
export const helpNameMap = {
  [TO_DISPLAY_STRING]: "toDisplayString",
  [CREATE_TEXT]: "createTextVNode",
  [CREATE_ELEMENT_VNODE]: "createElementVNode",
  [CREATE_ELEMENT_BLOCK]: "createElementBlock",
  [OPEN_BLOCK]: "openBlock",
  [FRAGMENT]: "fragment",
};

// 枚举本质就是对象

export function createCallExpression(context, args) {
  context.helper(CREATE_TEXT);
  return {
    type: NodeTypes.JS_CALL_EXPRESSION, // createTextVnode()
    arguments: args,
  };
}

export function createVNodeCall(context, tag, props, children) {
  context.helper(CREATE_ELEMENT_VNODE);

  return {
    type: NodeTypes.VNODE_CALL, // createElementVNode()
    tag,
    props,
    children,
  };
}

export function createObjectExpression(properties) {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION, // 增加类型标识
    properties,
  };
}
