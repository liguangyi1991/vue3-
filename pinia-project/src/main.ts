import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { createPinia } from "pinia";
const pinia = createPinia();
const app = createApp(App);
// 使用pinia 插件
app.use(pinia).mount("#app");

// createPinia
