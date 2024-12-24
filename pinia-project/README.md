# Pinia 对比 Vuex

- 啥时候会用 vuex （状态共享，跨级通信） 单一职责（用一个 store 来统一管理状态）。 状态管理是单向的（可以通过特定的方法来修改状态）
- localStorage(不是响应式的) window 属性会污染全局变量。
- Vuex 中我们常见的特点 state(data),getter(计算属性)，(mutation,action) (method) 区分 action 和 mutation 的区别？
- 我们修改状态只能通过 mutation 来修改状态。 action （整合多个 mutation ,可以放异步逻辑 (复用)） ?
- module vuex 中的模块 太难用. 模块的名字和跟根模块的状态同名 （会覆盖根模块） 状态最终都会定义在跟模块上，调用太长了
- store.state.a.b.c.d. 多个模块之间相互调用也不完美。
- 辅助方法 快速获得某个模块。。
- 源代码是基于 js 来编写的 + ts 类型声明
- 树状结构编写的时候也麻烦。
- namespaced：true 这样才能让模块独立

- 以前是一个 store 现在是多个 store， 以前是 optionsApi 现在是可以支持 setupApi
- ts 写的 体积小，扁平化，拆分模块容易
- 取消了 mutations
