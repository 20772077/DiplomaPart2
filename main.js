import './assets/main.css'
import router from './router.js';
import { createApp } from 'vue'
import App from './App.vue'

import axios from "axios";
axios.defaults.baseURL = 'http://localhost:3005';

createApp(App).use(router).mount('#app');
