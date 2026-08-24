import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Bootstrap CSS + JS
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Global application styles
import './style/index.css'

// Firebase Web SDK initialization (public config only)
import './firebase/config'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
