export const isObject = (value) => {
  return value != null && typeof value === "object";
};

export const isFunction = (value) => {
  return typeof value === "function";
};
