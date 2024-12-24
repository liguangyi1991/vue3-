import { isString } from "@vue/shared";
import { NodeTypes } from "./ast";
import { parser } from "./parser";
import {
  CREATE_ELEMENT_BLOCK,
  CREATE_ELEMENT_VNODE,
  CREATE_TEXT,
  helpNameMap,
  OPEN_BLOCK,
  TO_DISPLAY_STRING,
  FRAGMENT,
} from "./runtimeHelpers";
import { transform } from "./transform";
function createCodegenContext() {
  const context = {
    helper: (type) => "_" + helpNameMap[type],
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
  context.push(`${context.helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  context.push(`)`);
}
function genExpression(node, context) {
  context.push(node.content);
}
function genList(list, context) {
  // createElement('tag',{},)
  for (let i = 0; i < list.length; i++) {
    let node = list[i];
    if (isString(node)) {
      context.push(node);
    } else if (Array.isArray(node)) {
      // 多个孩子
      genList(node, context);
    } else {
      // 可能是属性，也有可能是一个儿子
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
  // 标签 属性 儿子
  // 列表
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
  // [] => {a:1,b:2}
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
  context.push(")"); // createTextVnode('123')
}

function genCompoundExpression(node, context) {
  // createTextVnode(aa  +  aa )
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (isString(child)) {
      context.push(child, "1"); // +
    } else {
      // 文本  或者表达式
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
    case NodeTypes.TEXT: //  文本
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION: // 表达式 {{name}}
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION: // 表达式中的变量
      genExpression(node, context);
      break;
    // 生成元素
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node, context);
      break;
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node, context);
      break;
    case NodeTypes.ELEMENT:
      // 根据元素我们之前生成 codegenNode来继续生成
      genNode(node.codegenNode, context);
      break;
    case NodeTypes.TEXT_CALL: // 文本中要生成createTextVnode
      genNode(node.codegenNode, context);
      break;
    case NodeTypes.JS_CALL_EXPRESSION: // 文本生成
      genCallExpression(node, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context);
      break;
    // case  NodeTypes.
  }
}
function generate(ast) {
  const context = createCodegenContext(); // 产生上下文
  genFunctionPreamble(ast, context); // 生成import语句
  context.push(
    // 生成导出函数
    `export function (_ctx, _cache, $props, $setup, $data, $options){`
  );
  context.indent();
  context.push(`return `); // return
  if (ast.codegenNode) {
    // 如果有codegen，用codegen
    genNode(ast.codegenNode, context); // 生成节点
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
