import { NodeTypes } from "./ast";

function createParserContext(template) {
  return {
    line: 1, // 行号
    column: 1, // 列号
    offset: 0, // 偏移量
    source: template, // 会不停地被截取 直到字符串为空的时候
    originalSource: template,
  };
}

function advancePositionWithMutation(context, source, endIndex) {
  let linesCount = 0; // 计算经过多少行  \n
  let linePos = -1; // 遇到换行标记换行的开始位置
  // 根据结束索引遍历内容，看一下经历了多少个\n字符
  for (let i = 0; i < endIndex; i++) {
    if (source[i].charCodeAt(0) === 10) {
      // 就是换行
      linesCount++;
      linePos = i;
    }
  }
  context.line += linesCount;
  context.offset += endIndex;
  context.column =
    linePos == -1 ? context.column + endIndex : endIndex - linePos;
}

function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset };
}
// 循环遍历模板的终止条件，如果为空说明遍历完毕
function isEnd(context) {
  const source = context.source;

  // 如果遇到 </div>

  if (context.source.startsWith("</")) {
    // 如果遇到了 </div>
    return true;
  }

  return !source;
}
// 前进是删除解析
function advanceBy(context, endIndex) {
  let source = context.source;
  advancePositionWithMutation(context, source, endIndex);
  // 删除解析后的内容
  context.source = source.slice(endIndex);
}
function parserTextData(context, endIndex) {
  const content = context.source.slice(0, endIndex);
  // 截取后需要将context.source中的内容删除掉，删除已经解析的内容
  advanceBy(context, endIndex);
  return content;
}

function getSelection(context, start, end?) {
  end = getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  };
}
function parserText(context) {
  // 如何计算文本的结束位置
  // 假设法求末尾的索引，得到距离自己最近的 < 或者 {{ 就结束嘞
  let endTokens = ["<", "{{"];
  let endIndex = context.source.length; // 默认末尾是是最后一位
  let start = getCursor(context);
  // 1<{}
  for (let i = 0; i < endTokens.length; i++) {
    // 因为开头肯定是文本，所以第一个字符肯定不是 < {{, 从下一个开始查找
    const index = context.source.indexOf(endTokens[i], 1);
    if (index > -1 && index < endIndex) {
      // 没到结尾就遇到了 {{  <
      endIndex = index; // 用最近的作为 我们的结尾
    }
  }
  // context 是当前正在解析的内容，所以不用考虑startIndex
  const content = parserTextData(context, endIndex);
  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start),
  };
}

function parserInterpolation(context) {
  const start = getCursor(context); // 表达式的开始信息
  const clonseIndex = context.source.indexOf("}}", 2);

  advanceBy(context, 2); // 删除嘞 {{

  const innerStart = getCursor(context);

  const rawContentEndIndex = clonseIndex - 2; // 获取原始用户大括号中的内容长度

  // 获取去空格是之前的内容
  const preTrimContent = parserTextData(context, rawContentEndIndex);
  const innerEnd = getCursor(context);
  const content = preTrimContent.trim(); // 去掉内容的空格
  advanceBy(context, 2); // 去掉 }}
  // {
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      content: content, // 内容 **
      loc: getSelection(context, innerStart, innerEnd), // 有点小bug
    },
    loc: getSelection(context, start),
  };
}
function advnaceBySpaces(context) {
  const match = /^[ \t\r\n]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length); // 删除所有空格
  }
}

function parseAttributeValue(context) {
  // 如果有引号 删除引号，没有引号可以直接用
  const quote = context.source[0];
  const isQuoted = quote === "'" || quote === '"'; // a='1' a="a"
  let content;
  if (isQuoted) {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf(quote); // 结尾的索引   '   '
    content = parserTextData(context, endIndex);
    advanceBy(context, 1);

    return content;
  } else {
  }
}

function parseAttribute(context) {
  const start = getCursor(context); // <div a = b

  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);

  const name = match[0]; // 获取属性名字

  advanceBy(context, name.length); // 删除属性名

  let value;

  // 先匹配空格 和 = 删除掉 后面的就是数学
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    //   b
    advnaceBySpaces(context);
    advanceBy(context, 1);
    advnaceBySpaces(context);
    value = parseAttributeValue(context); //  vue 2直接搞一个匹配属性的正则就可以了
  }

  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: {
      content: value,
    },
    loc: getSelection(context, start),
  };
}
function parseAttributes(context) {
  // 解析属性

  const props = []; // <div   >

  while (!context.source.startsWith(">")) {
    // 遇到> 就停止循环
    const prop = parseAttribute(context);
    props.push(prop);
    advnaceBySpaces(context);
  }

  return props;
}
function parserTag(context) {
  const start = getCursor(context);

  // match 1) 匹配出来的是完整的字符串  <div></div>  match[0] = <div
  // 2) 第一个分组
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
  const tag = match[1]; //'div'
  advanceBy(context, match[0].length); // <div
  advnaceBySpaces(context);
  // 处理元素上的属性
  let props = parseAttributes(context);
  let isSelfClosing = context.source.startsWith("/>"); // 我需要删除闭合标签
  advanceBy(context, isSelfClosing ? 2 : 1);
  return {
    type: NodeTypes.ELEMENT,
    isSelfClosing,
    tag,
    props,
    loc: getSelection(context, start),
  };
}

function parserElement(context) {
  let node = parserTag(context); // 先处理开始标签
  (node as any).children = parseChilren(context); // 需要在处理标签后，处理的子元素都是她的儿子
  // <div><span></span><div>
  if (context.source.startsWith("</")) {
    // </div>
    parserTag(context); // 删除标签的闭合标签，没有收集
  }
  node.loc = getSelection(context, node.loc.start); // 更新之前的信息
  return node;
}
function parseChilren(context) {
  const nodes = [];
  while (!isEnd(context)) {
    const s = context.source; // 获取当前的内容
    let node; // 当前处理的节点
    if (s[0] === "<") {
      // 我可以对元素进行处理
      node = parserElement(context);
    } else if (s.startsWith("{{")) {
      // 我们可以对表达式进行处理
      node = parserInterpolation(context);
    }
    if (!node) {
      // 这个东西就是文本
      node = parserText(context);
    }
    // 1
    nodes.push(node);
  }

  // 处理后的节点 如果是文本 多个空格 应该合并成一个

  // 如果解析后的结果是纯空格 ，则直接移除就可以了

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.type === NodeTypes.TEXT) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        nodes[i] = null; // 如果是空节点 则直接变为null
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
    type: NodeTypes.ROOT,
    children,
    loc,
  };
}
export function parser(template) {
  // 解析的时候 解析一点删除一点,解析的终止条件是模板的内容最终为空
  // 状态机 , 有限状态机。找到每一个字符串进行处理
  const context = createParserContext(template);
  const start = getCursor(context);
  return createRoot(parseChilren(context), getSelection(context, start));
}
