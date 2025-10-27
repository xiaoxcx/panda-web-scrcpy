<template>
  <v-app>
    <!-- <v-icon icon="mdi-cellphone-android" color="primary" size="large"></v-icon> -->
    <router-view />
  </v-app>
</template>

<script setup>
import { ref } from 'vue';
import { VApp, VIcon } from 'vuetify/components';
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}
</style>
