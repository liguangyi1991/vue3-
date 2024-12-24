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

// packages/compiler-core/src/index.ts
function transformExpression(node, context) {
  if (node.type === 5 /* INTERPOLATION */) {
    console.log("\u8868\u8FBE\u5F0F\u5904\u7406", node, context, "----");
  }
}
function transformElement(node, context) {
  if (node.type === 1 /* ELEMENT */) {
    console.log("\u8868\u8FBE\u5F0F\u5143\u7D20", node, context, "----");
  }
}
function transformText(node, context) {
  if (node.type === 2 /* TEXT */ || node.type === 5 /* INTERPOLATION */) {
    console.log("\u6587\u672C\u8F6C\u6362", node, context, "----");
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
function traverseNode(ast, context) {
  context.currentNode = ast;
  const transforms = context.nodeTransform;
  for (let i = 0; i < transforms.length; i++) {
    transforms[i](ast, context);
  }
  switch (ast.type) {
    case 0 /* ROOT */:
    case 1 /* ELEMENT */:
      for (let i = 0; i < ast.children.length; i++) {
        context.parent = ast;
        traverseNode(ast.children[i], context);
      }
  }
}
function transform(root) {
  const context = createTransformContext(root);
  traverseNode(root, context);
}
function compile(template) {
  const ast = parser(template);
  transform(ast);
  return;
}
export {
  compile
};
//# sourceMappingURL=compiler-core.js.map
