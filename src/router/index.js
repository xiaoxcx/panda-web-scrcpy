import { createRouter, createWebHistory } from 'vue-router'
import DeviceView from '../views/DeviceView.vue'
import DeviceView2 from '../views/DeviceView2.vue'
import AbstractList from '../views/AbstractList.vue'

const routes = [
  {
    path: '/',
    name: 'DeviceView',
    component: DeviceView
  },
  {
    path: '/DeviceView2',
    name: 'DeviceView2',
    component: DeviceView2 
  },
  {
    path: '/abstract',
    name: 'AbstractList',
    component: AbstractList
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router