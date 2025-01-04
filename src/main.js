import { createApp } from 'vue'
import App from './App.vue'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
})

// 创建Vue应用实例
const app = createApp(App)

// 使用Vuetify
app.use(vuetify)

// 挂载应用
app.mount('#app')
