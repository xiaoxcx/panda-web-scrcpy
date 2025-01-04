<template>
  <v-app>
    <!-- <v-icon icon="mdi-cellphone-android" color="primary" size="large"></v-icon> -->
    <DeviceView :room-name="roomName" :current-user="currentUser" />
  </v-app>
</template>

<script setup>
import { ref } from 'vue';
import { VApp, VIcon } from 'vuetify/components';
import DeviceView from './views/DeviceView.vue';

const roomName = ref('default-room');
const currentUser = ref({
  id: 'default-user',
  name: 'Default User',
});
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}
</style>
