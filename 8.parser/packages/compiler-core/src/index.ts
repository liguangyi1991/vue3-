import { NodeTypes } from "./ast";
import { parser } from "./parser";

function transformExpression(node, context) {
  // {{NAME}}
  // {{}}

  if (node.type === NodeTypes.INTERPOLATION) {
    console.log("表达式处理", node, context, "----");
  }
}
function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    console.log("表达式元素", node, context, "----");
  }
}

function transformText(node, context) {
  if (node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION) {
    console.log("文本转换", node, context, "----");
  }
}

function createTransformContext(root) {
  // <div>1123 <span>></div><
  const context = {
    currentNode: root,
    parent: null,
    // vue3 早期没有优化的时候 可以用set来去重   计数功能  {createVnode:5}
    helpers: new Map(), // 用于存储用到的方法
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
      // 稍后我会遍历树，拿到节点调用这些转化方法进行转换
      transformExpression,
      transformElement,
      transformText,
    ],
  };

  return context;
}
// vue2 中转化 只做了标记， vue3中patchFlags, block的处理
function traverseNode(ast, context) {
  context.currentNode = ast;
  const transforms = context.nodeTransform; // 获取所有的转化方法
  for (let i = 0; i < transforms.length; i++) {
    transforms[i](ast, context);
  }
  switch (ast.type) {
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      for (let i = 0; i < ast.children.length; i++) {
        context.parent = ast;
        traverseNode(ast.children[i], context);
      }
  }
}

function transform(root) {
  // 可以将一直使用的东西 通过上下文存储、 co的源码， 遍历树
  const context = createTransformContext(root);

  // dom树遍历 只能采用深度遍历

  traverseNode(root, context);
}

export function compile(template) {
  const ast = parser(template); // 1） 对模板的ast生产
  transform(ast); // 对ast语法树进行转化  给ast节点是增加一些额外的信息  codegenNode, 收集需要导入的方法
  return;
}

// createElementVnode
// openBlock()

// toDisplayString
// Fragmet
