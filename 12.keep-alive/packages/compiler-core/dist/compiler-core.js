// packages/shared/src/index.ts
function isString(value) {
  return typeof value === "string";
}

// packages/compiler-core/src/parser.ts
function createParserContext(template) {
  return {
    line: 1,
    column: 1,
    offset: 0,
    source: template,
    originalSource: template
  };
}
function advancePositionWithMutation(context, source, endIndex) {
  let linesCount = 0;
  let linePos = -1;
  for (let i = 0; i < endIndex; i++) {
    if (source[i].charCodeAt(0) === 10) {
      linesCount++;
      linePos = i;
    }
  }
  context.line += linesCount;
  context.offset += endIndex;
  context.column = linePos == -1 ? context.column + endIndex : endIndex - linePos;
}
function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset };
}
function isEnd(context) {
  const source = context.source;
  if (context.source.startsWith("</")) {
    return true;
  }
  return !source;
}
function advanceBy(context, endIndex) {
  let source = context.source;
  advancePositionWithMutation(context, source, endIndex);
  context.source = source.slice(endIndex);
}
function parserTextData(context, endIndex) {
  const content = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);
  return content;
}
function getSelection(context, start, end) {
  end = getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  };
}
function parserText(context) {
  let endTokens = ["<", "{{"];
  let endIndex = context.source.length;
  let start = getCursor(context);
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1);
    if (index > -1 && index < endIndex) {
      endIndex = index;
    }
  }
  const content = parserTextData(context, endIndex);
  return {
    type: 2 /* TEXT */,
    content,
    loc: getSelection(context, start)
  };
}
function parserInterpolation(context) {
  const start = getCursor(context);
  const clonseIndex = context.source.indexOf("}}", 2);
  advanceBy(context, 2);
  const innerStart = getCursor(context);
  const rawContentEndIndex = clonseIndex - 2;
  const preTrimContent = parserTextData(context, rawContentEndIndex);
  const innerEnd = getCursor(context);
  const content = preTrimContent.trim();
  advanceBy(context, 2);
  return {
    type: 5 /* INTERPOLATION */,
    content: {
      type: 4 /* SIMPLE_EXPRESSION */,
      isStatic: false,
      content,
      loc: getSelection(context, innerStart, innerEnd)
    },
    loc: getSelection(context, start)
  };
}
function advnaceBySpaces(context) {
  const match = /^[ \t\r\n]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}
function parseAttributeValue(context) {
  const quote = context.source[0];
  const isQuoted = quote === "'" || quote === '"';
  let content;
  if (isQuoted) {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf(quote);
    content = parserTextData(context, endIndex);
    advanceBy(context, 1);
    return content;
  } else {
  }
}
function parseAttribute(context) {
  const start = getCursor(context);
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  const name = match[0];
  advanceBy(context, name.length);
  let value;
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advnaceBySpaces(context);
    advanceBy(context, 1);
    advnaceBySpaces(context);
    value = parseAttributeValue(context);
  }
  return {
    type: 6 /* ATTRIBUTE */,
    name,
    value: {
      content: value
    },
    loc: getSelection(context, start)
  };
}
function parseAttributes(context) {
  const props = [];
  while (!context.source.startsWith(">")) {
    const prop = parseAttribute(context);
    props.push(prop);
    advnaceBySpaces(context);
  }
  return props;
}
function parserTag(context) {
  const start = getCursor(context);
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length);
  advnaceBySpaces(context);
  let props = parseAttributes(context);
  let isSelfClosing = context.source.startsWith("/>");
  advanceBy(context, isSelfClosing ? 2 : 1);
  return {
    type: 1 /* ELEMENT */,
    isSelfClosing,
    tag,
    props,
    loc: getSelection(context, start)
  };
}
function parserElement(context) {
  let node = parserTag(context);
  node.children = parseChilren(context);
  if (context.source.startsWith("</")) {
    parserTag(context);
  }
  node.loc = getSelection(context, node.loc.start);
  return node;
}
function parseChilren(context) {
  const nodes = [];
  while (!isEnd(context)) {
    const s = context.source;
    let node;
    if (s[0] === "<") {
      node = parserElement(context);
    } else if (s.startsWith("{{")) {
      node = parserInterpolation(context);
    }
    if (!node) {
      node = parserText(context);
    }
    nodes.push(node);
  }
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 2 /* TEXT */) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        nodes[i] = null;
      } else {
        node.content = node.content.replace(/[\t\r\n\f ]+/g, " ");
      }
    }
  }
  return nodes.filter((item) => {
    return Boolean(item);
  });
}
function createRoot(children, loc) {
  return {
    type: 0 /* ROOT */,
    children,
    loc
  };
}
function parser(template) {
  const context = createParserContext(template);
  const start = getCursor(context);
  return createRoot(parseChilren(context), getSelection(context, start));
}

// packages/compiler-core/src/runtimeHelpers.ts
var TO_DISPLAY_STRING = Symbol("toDisplayString");
var CREATE_TEXT = Symbol("createTextVNode");
var CREATE_ELEMENT_VNODE = Symbol("createElementVnode");
var OPEN_BLOCK = Symbol("openBlock");
var FRAGMENT = Symbol("fragment");
var CREATE_ELEMENT_BLOCK = Symbol("createElementBlock");
var helpNameMap = {
  [TO_DISPLAY_STRING]: "toDisplayString",
  [CREATE_TEXT]: "createTextVNode",
  [CREATE_ELEMENT_VNODE]: "createElementVNode",
  [CREATE_ELEMENT_BLOCK]: "createElementBlock",
  [OPEN_BLOCK]: "openBlock",
  [FRAGMENT]: "fragment"
};
function createCallExpression(context, args) {
  context.helper(CREATE_TEXT);
  return {
    type: 14 /* JS_CALL_EXPRESSION */,
    arguments: args
  };
}
function createVNodeCall(context, tag, props, children) {
  context.helper(CREATE_ELEMENT_VNODE);
  return {
    type: 13 /* VNODE_CALL */,
    tag,
    props,
    children
  };
}
function createObjectExpression(properties) {
  return {
    type: 15 /* JS_OBJECT_EXPRESSION */,
    properties
  };
}

// packages/compiler-core/src/transform.ts
function transformExpression(node, context) {
  if (node.type === 5 /* INTERPOLATION */) {
    node.content.content = `_ctx.${node.content.content}`;
  }
}
function transformElement(node, context) {
  if (node.type === 1 /* ELEMENT */) {
    return () => {
      const properties = [];
      const props = node.props;
      for (let i = 0; i < props.length; i++) {
        let { name, value } = props[i];
        properties.push({
          key: name,
          value: value.content
        });
      }
      const vnodeProps = properties.length > 0 ? createObjectExpression(properties) : null;
      const vnodeTag = JSON.stringify(node.tag);
      let vnodeChildren = null;
      if (node.children.length === 1) {
        vnodeChildren = node.children[0];
      } else {
        if (node.children.length > 1) {
          vnodeChildren = node.children;
        }
      }
      return node.codegenNode = createVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren
      );
    };
  }
}
function isText(node) {
  return node.type === 5 /* INTERPOLATION */ || node.type === 2 /* TEXT */;
}
function transformText(node, context) {
  if (node.type === 0 /* ROOT */ || node.type === 1 /* ELEMENT */) {
    return () => {
      let hasText = false;
      const children = node.children;
      let currentContainer;
      for (let i = 0; i < children.length; i++) {
        let child = children[i];
        if (isText(child)) {
          hasText = true;
          for (let j = i + 1; j < children.length; j++) {
            const nextNode = children[j];
            if (isText(nextNode)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: 8 /* COMPOUND_EXPRESSION */,
                  children: [child]
                };
              }
              currentContainer.children.push(`+`, nextNode);
              children.splice(j, 1);
              j--;
            } else {
              currentContainer = null;
              break;
            }
          }
        }
      }
      if (!hasText || children.length == 1) {
        return;
      }
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isText(child) || child.type == 8 /* COMPOUND_EXPRESSION */) {
          const callArgs = [];
          callArgs.push(child);
          if (child.type != 2 /* TEXT */) {
            callArgs.push(1 /* TEXT */ + "");
          }
          children[i] = {
            type: 12 /* TEXT_CALL */,
            content: child,
            codegenNode: createCallExpression(context, callArgs)
          };
        }
      }
    };
  }
}
function createTransformContext(root) {
  const context = {
    currentNode: root,
    parent: null,
    helpers: /* @__PURE__ */ new Map(),
    helper(name) {
      const count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1);
      return name;
    },
    removeHelper(name) {
      const count = context.helpers.get(name);
      const currentCount = count - 1;
      if (!currentCount) {
        context.helpers.delete(name);
      } else {
        context.helpers.set(name, currentCount);
      }
    },
    nodeTransform: [
      transformExpression,
      transformElement,
      transformText
    ]
  };
  return context;
}
function traverseNode(node, context) {
  context.currentNode = node;
  const transforms = context.nodeTransform;
  let exitsFns = [];
  for (let i = 0; i < transforms.length; i++) {
    let exitFn = transforms[i](node, context);
    if (exitFn) {
      exitsFns.push(exitFn);
    }
  }
  switch (node.type) {
    case 0 /* ROOT */:
    case 1 /* ELEMENT */:
      for (let i = 0; i < node.children.length; i++) {
        context.parent = node;
        traverseNode(node.children[i], context);
      }
      break;
    case 5 /* INTERPOLATION */:
      context.helper(TO_DISPLAY_STRING);
      break;
  }
  let len = exitsFns.length;
  context.currentNode = node;
  while (len--) {
    exitsFns[len]();
  }
}
function createRootCodegen(root, context) {
  const { children } = root;
  if (children.length == 1) {
    const child = children[0];
    if (child.type == 1 /* ELEMENT */) {
      root.codegenNode = child.codegenNode;
      context.removeHelper(CREATE_ELEMENT_VNODE);
      context.helper(OPEN_BLOCK);
      context.helper(CREATE_ELEMENT_BLOCK);
      root.codegenNode.isBlock = true;
    } else {
      root.codegenNode = child;
    }
  } else {
    context.helper(OPEN_BLOCK);
    context.helper(CREATE_ELEMENT_BLOCK);
    root.codegenNode = createVNodeCall(
      context,
      context.helper(FRAGMENT),
      null,
      children
    );
    root.codegenNode.isBlock = true;
  }
}
function transform(root) {
  const context = createTransformContext(root);
  traverseNode(root, context);
  createRootCodegen(root, context);
  root.helpers = [...context.helpers.keys()];
}

// packages/compiler-core/src/index.ts
function createCodegenContext() {
  const context = {
    helper: (type) => "_" + helpNameMap[type],
    code: ``,
    push(code) {
      context.code += code;
    },
    level: 0,
    indent() {
      context.newline(++context.level);
    },
    deindent(needNewline = false) {
      if (!needNewline) {
        --context.level;
      } else {
        context.newline(--context.level);
      }
    },
    newline(level = context.level) {
      context.push(`
` + `  `.repeat(level));
    }
  };
  return context;
}
function genText(node, context) {
  context.push(JSON.stringify(node.content));
}
function genFunctionPreamble(ast, context) {
  if (ast.helpers.length > 0) {
    context.push(
      `import {${ast.helpers.map((helper) => `${helpNameMap[helper]} as _${helpNameMap[helper]}`).join(",")}} from "vue"`
    );
    context.newline();
  }
}
function genInterpolation(node, context) {
  context.push(`${context.helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  context.push(`)`);
}
function genExpression(node, context) {
  context.push(node.content);
}
function genList(list, context) {
  for (let i = 0; i < list.length; i++) {
    let node = list[i];
    if (isString(node)) {
      context.push(node);
    } else if (Array.isArray(node)) {
      genList(node, context);
    } else {
      genNode(node, context);
    }
    if (i < list.length - 1) {
      context.push(",");
    }
  }
}
function genVNodeCall(node, context) {
  const { push, helper } = context;
  const { tag, props, children, isBlock } = node;
  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(),`);
    push(helper(CREATE_ELEMENT_BLOCK));
  } else {
    push(helper(CREATE_ELEMENT_VNODE));
  }
  push("(");
  let list = [tag, props, children].filter(Boolean);
  if (list.length > 1) {
    genList(
      (children ? [tag, props, children] : [tag, props]).map(
        (item) => item || "null"
      ),
      context
    );
  } else {
    genList([tag], context);
  }
  push(")");
  if (isBlock) {
    push(")");
  }
}
function genObjectExpression(node, context) {
  const { properties } = node;
  const { push } = context;
  if (!properties) {
    return;
  }
  push("{");
  for (let i = 0; i < properties.length; i++) {
    const { key, value } = properties[i];
    push(key);
    push(":");
    push(JSON.stringify(value));
    if (i < properties.length - 1) {
      push(",");
    }
  }
  push("}");
}
function genCallExpression(node, context) {
  context.push(context.helper(CREATE_TEXT));
  context.push("(");
  genList(node.arguments, context);
  context.push(")");
}
function genCompoundExpression(node, context) {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (isString(child)) {
      context.push(child, "1");
    } else {
      genNode(child, context);
    }
  }
}
function genNode(node, context) {
  if (typeof node === "symbol") {
    context.push(context.helper(FRAGMENT));
    return;
  }
  switch (node.type) {
    case 2 /* TEXT */:
      genText(node, context);
      break;
    case 5 /* INTERPOLATION */:
      genInterpolation(node, context);
      break;
    case 4 /* SIMPLE_EXPRESSION */:
      genExpression(node, context);
      break;
    case 13 /* VNODE_CALL */:
      genVNodeCall(node, context);
      break;
    case 15 /* JS_OBJECT_EXPRESSION */:
      genObjectExpression(node, context);
      break;
    case 1 /* ELEMENT */:
      genNode(node.codegenNode, context);
      break;
    case 12 /* TEXT_CALL */:
      genNode(node.codegenNode, context);
      break;
    case 14 /* JS_CALL_EXPRESSION */:
      genCallExpression(node, context);
      break;
    case 8 /* COMPOUND_EXPRESSION */:
      genCompoundExpression(node, context);
      break;
  }
}
function generate(ast) {
  const context = createCodegenContext();
  genFunctionPreamble(ast, context);
  context.push(
    `export function (_ctx, _cache, $props, $setup, $data, $options){`
  );
  context.indent();
  context.push(`return `);
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context);
  } else {
    context.push(null);
  }
  context.deindent(true);
  context.push(`}`);
  return context.code;
}
function compile(template) {
  const ast = parser(template);
  transform(ast);
  return generate(ast);
}
export {
  compile
};
//# sourceMappingURL=compiler-core.js.map
