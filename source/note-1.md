## 启动 Vue3.0

> Vue3 中使用 pnpm workspace 来实现 monorepo。我们应该使用 pnpm 来进行依赖安装。

```shell
git clone https://github.com/vuejs/core.git --depth=1
pnpm install
```

> 安装好后，我们通过 scripts 脚本找到启动命令

```json
{
  "scripts": {
    "dev": "node scripts/dev.js", // 开发环境
    "build": "node scripts/build.js" // 生产环境
  }
}
```

这里我们主要是启动一个开发环境用于调试代码，那咱们就从 dev 命令看起

## 打包的三种格式

- iife 立即执行函数最终将结果挂载到全局上。
- cjs 最终生成`module.exports` 导出的方式
- esm es6Module 最终生成的结果是 `export default`

输出文件的分类：

- `global`立即执行函数的格式，会暴露全局对象
- `esm-browser`在浏览器中使用的格式，内联所有的依赖项。
- `esm-bundler`在构建工具中使用的格式，不提供.prod 格式，在构建应用程序时会被构建工具一起进行打包压缩。
- `cjs`在 node 中使用的格式，服务端渲染。

## 调试响应式模块

修改运行脚本，指定运行模块为`reactivity`，格式为`esm-browser`

```shell
node scripts/dev.js reactivity -f esm-browser
```
