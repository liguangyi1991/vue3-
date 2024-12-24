export function patchClass(el, nextVal) {
  if (nextVal == null) {
    el.removeAttribute("class");
  } else {
    el.className = nextVal;
  }
}
