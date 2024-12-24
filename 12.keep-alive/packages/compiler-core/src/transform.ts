import { PatchFlags } from "packages/shared/src/patchFlags";

import { NodeTypes } from "./ast";

import {
  createCallExpression,
  createObjectExpression,
  createVNodeCall,
  CREATE_ELEMENT_BLOCK,
  CREATE_ELEMENT_VNODE,
  OPEN_BLOCK,
  FRAGMENT,
  TO_DISPLAY_STRING,
} from "./runtimeHelpers";

function transformExpression(node, context) {
  if (node.type === NodeTypes.INTERPOLATION) {
    // 给表达式增加this 指向
    node.content.content = `_ctx.${node.content.content}`;
  }
}
function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    return () => {
      // 退出函数
      const properties = [];
      const props = node.props;
      for (let i = 0; i < props.length; i++) {
        let { name, value } = props[i];
        properties.push({
          key: name,
          value: value.content,
        });
      }
      const vnodeProps =
        properties.length > 0 ? createObjectExpression(properties) : null;
      const vnodeTag = JSON.stringify(node.tag);
      // 儿子可能是 一个节点， 或者是多个
      let vnodeChildren = null;
      if (node.children.length === 1) {
        vnodeChildren = node.children[0];
      } else {
        if (node.children.length > 1) {
          vnodeChildren = node.children;
        }
      }

      return (node.codegenNode = createVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren
      ));
    };
  }
}

function isText(node) {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT;
}
function transformText(node, context) {
  if (node.type === NodeTypes.ROOT || node.type === NodeTypes.ELEMENT) {
    return () => {
      // 默认看第一个元素是不是文本，如果是在尝试看下一个元素是不是文本，如果不是就不拼接了
      let hasText = false;
      const children = node.children; // 先获取所有儿子
      let currentContainer;
      for (let i = 0; i < children.length; i++) {
        let child = children[i];
        if (isText(child)) {
          // 是文本
          hasText = true;
          for (let j = i + 1; j < children.length; j++) {
            const nextNode = children[j];
            if (isText(nextNode)) {
              // 要将两个节点合并在一起
              if (!currentContainer) {
                // 用第一个节点作为拼接的节点，将下一个节点拼接上去即可
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION, // 组合表达式
                  children: [child],
                };
              }
              currentContainer.children.push(`+`, nextNode);
              children.splice(j, 1); // 删除儿子的当前项，并且，防止塌陷需要--
              j--;
              // hello {{aa}} <span></span> {{b}} world
            } else {
              currentContainer = null;
              break; // 遇到了元素的时候 需要跳出，再找下一个个元素
            }
          }
        }
      }
      // <div>hello</div>
      if (!hasText || children.length == 1) {
        // 元素里面都是元素，没有处理文本 直接跳过就可以了
        return;
      }
      // 对于文本我们需要采用createTextVNode 来进行方法生成
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isText(child) || child.type == NodeTypes.COMPOUND_EXPRESSION) {
          const callArgs = [];
          callArgs.push(child);

          if (child.type != NodeTypes.TEXT) {
            callArgs.push(PatchFlags.TEXT + "");
          }
          // 将此元素 进行处理 处理成 createTextVnode的格式
          children[i] = {
            // type是ast的标识
            type: NodeTypes.TEXT_CALL, // 生成文本调用
            content: child,
            // 生成代码 在transform中会生成一些额外的信息，是用于代码生成ed
            codegenNode: createCallExpression(context, callArgs),
          };
        }
      }
      // 对于文本来说 主要是根据文本的特性来生成 createTextVnode(内容,标示位)
      // instance.proxy
      // 将多个文本元素合并成一个 {{abc}} hello  ->  createTextVnode(proxy.abc + 'hello')
    };
  }
}

function createTransformContext(root) {
  const context = {
    currentNode: root,
    parent: null,
    helpers: new Map(),
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

    // 装饰器、洋葱模型
    nodeTransform: [
      // 稍后我会遍历树，拿到节点调用这些转化方法进行转换
      transformExpression,
      transformElement,
      transformText,
    ],
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
      exitsFns.push(exitFn); // 最外层
    }
  }
  switch (
    node.type // 里层的
  ) {
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      for (let i = 0; i < node.children.length; i++) {
        context.parent = node;
        traverseNode(node.children[i], context);
      }
      break;
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;
  }
  // 整个儿子执行完毕后, 依次调用退出函数
  let len = exitsFns.length;
  context.currentNode = node;
  while (len--) {
    exitsFns[len](); //  保证退出函数中拿到的currentNode是正确的，我们还要将其还原回去
  }
}
function createRootCodegen(root, context) {
  const { children } = root;

  if (children.length == 1) {
    const child = children[0];

    if (child.type == NodeTypes.ELEMENT) {
      root.codegenNode = child.codegenNode; // 如果是元素 则直接用元素就可以了
      context.removeHelper(CREATE_ELEMENT_VNODE);
      context.helper(OPEN_BLOCK);
      context.helper(CREATE_ELEMENT_BLOCK);
      root.codegenNode.isBlock = true; // 标记为block节点
      // createElementVnode / createElmenetBlock
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
export function transform(root) {
  const context = createTransformContext(root);
  traverseNode(root, context);
  createRootCodegen(root, context);
  root.helpers = [...context.helpers.keys()];
}
