## 环境搭建

- vue3 源码开发环境 esbuild 生产环境 rollup （rollup 更适合类库的打包）
- 打包的结果 （iife） 立即执行函数，将结果定义到全局变量上（umd x） 为了支持 amd 的语法。 esModule (esm-bundler 主要是在工程化中使用的，不会将所有包打包到一起,esm-browser 在浏览器中可以通过 type="module"来进行使用的模块， 会将所有的模块打包到一起) commonjs (cjs) 主要是给 node 来使用的。 （node 中的 mjs 也是像 esm 来进行发展的）
- vue3 monorepo 的方式进行了仓库管理 pnpm.
- 模块的打包格式、和项目搭建的方式。

## vue3 核心模块 reactivity

- compositionApi 的特点和好处。 reactivity 内部提供的 api 都是核心的 compositionApi
- reactive（proxy） ref(defineProperty) 核心的响应式 api
- shawllowReactive shallowRef readonly shallowReadonly( 属性就丧失了收集能力)
- toRaw(通过代理后的结果，返回原值) markRaw()
- effect (渲染 computed watch watchEffect) 都是基于 effect 来实现
- 依赖收集 track() map 映射表来维护数据和 effect 的关系 trigger() 通过属性来触发对应的 effect 来执行
- effect.stop() 停止依赖收集 effect.run() 让 effect 再次运行 === forceUpdate
- isRef() isReactive() isReadonly() isProxy()
- toRef toRefs({}) proxyRefs() 将 ref 转换成代理方式来访问

## vue3 runtime-dom runtime-core

- runtime-dom 提供了上层的 api “createRenderer() render()" createApp
  内部封装了 dom 操作 api 节点和属性相关的 (最终将方法提供给 runtime-core 来使用)

- runtime-core(不依赖于平台 虚拟 dom) h() -> createVNode(类型、属性、儿子（文本、数组、null）)
- 通过上层传递的 api 来进行渲染。 递归渲染（patch）。 创建元素、属性和儿子
- 卸载元素 render(null) 来去卸载元素
- 更新 patch() diff 算法 （平级比较、不涉及到跨级比较。 全量比对）
  - 1） 之前和之后的元素不是同一个节点（tag，key），删除老的换新的。
  - 2） 是同一个节点、会复用节点，之后更新属性和儿子
  - 3） 儿子更新有九种方式 （双方儿子都是列表的情况）
  - 4） 同序列比较来进行了优化 sync from start / sync from end (挂载、卸载)
  - 5） 确定两个序列中变化的部分。 根据新节点创建映射表，用来的节点去找，如果新的中没有则删除、有的就复用比较属性和儿子

## 面试题

- compositionApi 和 optionsApi 对比有什么优势
- reactive 和 ref 的区别
- computed (缓存 dirtry) 和 watch 的区别 watch(响应式数据) watch(()=> 响应式的值) flsuh:'sync'
- watch 和 watchEffect 的区别
- vue3 的组成 （编译时 （compiler-dom compiler-core）、运行时 (runtime-dom runtime-core) reactivity）
- vue 中如何将虚拟节点转换成真实节点
- `.vue` template -> render 函数 需要编译时 （耗费性能，放在工程化中进行转化） 运行时就是不关心把模板转换成 render 函数

响应式原理 ， 依赖收集 ， diff 算法， 组件渲染， 模板的编译 ， 其它 api 实现
