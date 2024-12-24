// 高阶函数，最终我们要返回一个组件

import { ref } from "@vue/reactivity";
import { Fragment } from "./createVNode";
import { h } from "./h";

export const defineAsyncComponent = ({ loader, ...options }) => {
  return {
    setup() {
      const loaded = ref(false);
      const loading = ref(false);
      const error = ref(false);
      let errorTimer;
      if (options.timeout) {
        errorTimer = setTimeout(() => {
          error.value = true; // 已经到了超时时间，表示yan显示错误了
        }, options.timeout);
      }
      let timer;
      if (options.delay) {
        timer = setTimeout(() => {
          loading.value = true; // 正在加载中应该显示loading文字
        }, options.delay || 200);
      } else {
        loading.value = true;
      }
      let InternalComp;
      //   (load().catch().load().catch()).then().finally()
      function load() {
        return loader().catch((err) => {
          // 如果失败了 ， 我们需要重新尝试
          // 失败以后，要等待尝试的结果， 看一下尝试的结果是成功还是失败
          if (options.onError) {
            return new Promise((resolve, reject) => {
              const retry = () => {
                resolve(load());
              };
              const fail = (err) => {
                reject(err);
              };
              options.onError(err, retry, fail, ++attempts);
            });
          } else {
            throw err;
          }
        });
      }
      let attempts = 0;

      // 默认先调用一次loader
      // 看一下是否失败，如果正常就直接关闭loading即可
      // 如果加载失败了,看一下用户有没有提供onError方法,如果没有提供，直接报错
      // 如果加载失败了 用户提供了onError, 就看一下用户调用的那个方法，等待这个方法的promise返回值
      load()
        .then((comp) => {
          // promise已经加载完成
          loaded.value = true;
          error.value = false; // 加载成功了 就不在失败了
          InternalComp = comp;
        })
        .catch((err) => {
          error.value = true;
        })
        .finally(() => {
          // 只要成功或者失败都会执行
          loading.value = false;
        });

      return () => {
        // 此方法会被剁次调用
        if (error.value) {
          // 错误
          return h(options.errorComponent);
        } else if (loading.value) {
          // loading
          return h(options.loadingComponent);
        } else if (loaded.value) {
          // 成功
          return h(InternalComp);
        } else {
          // 空
          return h(Fragment, []);
        }
      };
    },
  };
};

// 在路由切换到某个页面之后，此时我希望增加loading

// function withLoading(loader){
//     return defineAsyncComponent({
//         loader
//         loadingComponent:{}
//     })
// }

// {
//     component: withLoading(()=> import('xxxx'))
// }
