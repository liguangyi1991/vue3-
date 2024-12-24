export const isObject = (value) => {
  return value != null && typeof value === "object";
};

export const isFunction = (value) => {
  return typeof value === "function";
};

export function isString(value) {
  return typeof value === "string";
}

export * from "./shapeFlag";
