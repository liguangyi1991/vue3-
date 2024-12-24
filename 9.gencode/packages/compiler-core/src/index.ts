import { NodeTypes } from "./ast";
import { parser } from "./parser";
import { helpNameMap, TO_DISPLAY_STRING } from "./runtimeHelpers";
import { transform } from "./transform";

function createCodegenContext() {
  const context = {
    code: ``, // 存储拼接后的代码
    push(code) {
      context.code += code; // 拼接字符串
    },
    level: 0,
    indent() {
      context.newline(++context.level);
    },
    deindent(needNewline = false) {
      // 是否换行向内缩进，还是直接缩进
      if (!needNewline) {
        --context.level;
      } else {
        context.newline(--context.level);
      }
    },
    newline(level = context.level) {
      context.push(`\n` + `  `.repeat(level));
    },
  };
  return context;
}
function genText(node, context) {
  context.push(JSON.stringify(node.content));
}

function genFunctionPreamble(ast, context) {
  // 放导入
  if (ast.helpers.length > 0) {
    context.push(
      `import {${ast.helpers
        .map((helper) => `${helpNameMap[helper]} as _${helpNameMap[helper]}`)
        .join(",")}} from "vue"`
    );
    context.newline();
  }
}

function genInterpolation(node, context) {
  // 我们的 INTERPOLATION 》 SIMPLE_EXPRESSION
  context.push(`_${helpNameMap[TO_DISPLAY_STRING]}(`);
  genNode(node.content, context);
  context.push(`)`);
}
function genExpression(node, context) {
  context.push(node.content);
}
function genNode(node, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
    // 生成元素
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
    // 如果有codegen，用codegen
    genNode(ast.codegenNode, context);
  } else {
    context.push(null); // 如果没有节点则直接null
  }
  context.deindent(true);
  context.push(`}`);
  return context.code;
}
export function compile(template) {
  const ast = parser(template); // parser 就是解析成语法树
  transform(ast); // 对语法树的类型标记和 和生成对应的转化代码
  // 代码生成
  return generate(ast);
}

// createElementVnode
// openBlock()

// toDisplayString
// Fragmet
