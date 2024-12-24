// 1.默认打包的格式是 global ， 打包的模块叫vue
// 2.打包的格式有三种 global(iife)  cjs(commonjs)  esm(es6Module)
// 3.打包后会将结果输出到对应的包下面的dist目录
// vue.global.js
// vue.esm-bundler.js（不会打包此模块依赖的模块）
// vue.esm-browser.js（将所有依赖打包成一个文件)
// @ts-check
const { build } = require('esbuild') // 这里采用esbuild来进行打包
const nodePolyfills = require('@esbuild-plugins/node-modules-polyfill')
const { resolve, relative } = require('path')
const args = require('minimist')(process.argv.slice(2)) // 获取用户传递的参数

const target = args._[0] || 'vue' // node scripts/dev vue -f global
const format = args.f || 'global' // 打包的格式是全局中使用
const inlineDeps = args.i || args.inline // 内连所有依赖
const pkg = require(resolve(__dirname, `../packages/${target}/package.json`))
// 找到要打包的package.json文件

// resolve output
// 模块的三种格式
const outputFormat = format.startsWith('global') // const Vue = (function(){})()
  ? 'iife'
  : format === 'cjs'
  ? 'cjs' // module.exports = xxx
  : 'esm' // export default xxx
// 如果格式是以-runtime 结尾的则会移除后缀
const postfix = format.endsWith('-runtime')
  ? `runtime.${format.replace(/-runtime$/, '')}`
  : format

const outfile = resolve(
  __dirname,
  `../packages/${target}/dist/${
    target === 'vue-compat' ? `vue` : target
  }.${postfix}.js` // 定义出口，就是当前打包目录下生成 /dist/vue.global.js
)
const relativeOutfile = relative(process.cwd(), outfile)

// resolve externals
// TODO this logic is largely duplicated from rollup.config.js
let external = []
if (!inlineDeps) {
  // 如果不是把依赖都打包在一起，需要配置external，排除掉依赖的模块
  // cjs & esm-bundler: external all deps
  if (format === 'cjs' || format.includes('esm-bundler')) {
    external = [
      ...external,
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
      // for @vue/compiler-sfc / server-renderer
      'path',
      'url',
      'stream'
    ]
  }
  // 针对compiler-sfc单独做处理
  if (target === 'compiler-sfc') {
    const consolidateDeps = require.resolve('@vue/consolidate/package.json', {
      paths: [resolve(__dirname, `../packages/${target}/`)]
    })
    external = [
      ...external,
      ...Object.keys(require(consolidateDeps).devDependencies),
      'fs',
      'vm',
      'crypto',
      'react-dom/server',
      'teacup/lib/express',
      'arc-templates/dist/es5',
      'then-pug',
      'then-jade'
    ]
  }
}
// esbuild打包
build({
  // 打包入口
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.ts`)],
  // 输出的文件
  outfile,
  // 将打包的结果做成一个bundle
  bundle: true,
  // 排除掉不需要打包的模块
  external,
  // 开启sourcemap
  sourcemap: true,
  // 打包的模块格式
  format: outputFormat,
  // 全局的名字，在package.json 中
  globalName: pkg.buildOptions?.name,
  // 打包的平台
  platform: format === 'cjs' ? 'node' : 'browser',
  // 使用esbuild插件
  plugins:
    format === 'cjs' || pkg.buildOptions?.enableNonBrowserBranches
      ? [nodePolyfills.default()]
      : undefined,
  // 定义环境变量
  define: {
    __COMMIT__: `"dev"`,
    __VERSION__: `"${pkg.version}"`,
    __DEV__: `true`,
    __TEST__: `false`,
    __BROWSER__: String(
      format !== 'cjs' && !pkg.buildOptions?.enableNonBrowserBranches
    ),
    __GLOBAL__: String(format === 'global'),
    __ESM_BUNDLER__: String(format.includes('esm-bundler')),
    __ESM_BROWSER__: String(format.includes('esm-browser')),
    __NODE_JS__: String(format === 'cjs'),
    __SSR__: String(format === 'cjs' || format.includes('esm-bundler')),
    __COMPAT__: String(target === 'vue-compat'),
    __FEATURE_SUSPENSE__: `true`,
    __FEATURE_OPTIONS_API__: `true`,
    __FEATURE_PROD_DEVTOOLS__: `false`
  },
  // 监控打包
  watch: {
    onRebuild(error) {
      if (!error) console.log(`rebuilt: ${relativeOutfile}`)
    }
  }
}).then(() => {
  console.log(`watching: ${relativeOutfile}`)
})
