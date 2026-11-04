<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import DirectAdjustView from './DirectAdjustView.vue';
import ViceAdjustView from './ViceAdjustView.vue';

const authStore = useAuthStore();
const isVP = computed(() => authStore.isVicePrincipal);
</script>

<template>
  <ViceAdjustView v-if="isVP" />
  <DirectAdjustView v-else />
</template>
