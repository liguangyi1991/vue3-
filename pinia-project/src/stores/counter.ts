import { defineStore } from "pinia";
import { reactive, toRefs } from "vue";
// id是store的唯一标识
export const useCounterStore = defineStore("counter", () => {
  // setup入口函数
  const state = reactive({ count: 0 });
  const increment = () => {
    state.count++;
  };
  return {
    ...toRefs(state),
    increment,
  };
},{
    pers
});

// vue2中 实现原理是 new Vue
// 核心就是 store = reactive({})

// {
//     state() { // vuex中client用的是对象 ， ssr用的是函数
//       return { count: 0 };
//     },
//     actions: {
//       increment() {
//         this.count++;
//       },
//     },
//   }
