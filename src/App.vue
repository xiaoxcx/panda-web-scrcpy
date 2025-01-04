<template>
  <div id="app">
    <h1>{{ message }}</h1>
    <p>这是一个部署在GitHub Pages上的Vue 3 Demo项目</p>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      message: '欢迎来到Vue 3 GitHub Pages Demo!'
    }
  }
}
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
