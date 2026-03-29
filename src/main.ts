import { createApp } from "vue";
import App from "./App.vue";
import "./index.css";
import "material-icons/iconfont/material-icons.css";

import.meta.glob(
  ["../node_modules/@gui-chat-plugin/*/dist/style.css"],
  { eager: true },
);

createApp(App).mount("#app");
