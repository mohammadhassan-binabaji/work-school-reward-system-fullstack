<script setup lang="ts">
import owlImage from '../assets/images/owl.png';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
});

const sizeClasses = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-44 h-44',
  xl: 'w-64 h-64',
};
</script>

<template>
  <div :class="['relative flex items-center justify-center select-none', sizeClasses[props.size]]">
    <!-- Outer ambient neon aura -->
    <div
      class="absolute inset-0 rounded-full blur-xl opacity-40 bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400"
    ></div>

    <!-- Owl Mascot Image -->
    <img
      :src="owlImage"
      alt="Owl Mascot"
      class="w-full h-full relative z-10 drop-shadow-[0_10px_20px_rgba(0,229,255,0.3)] object-contain"
    />
  </div>
</template>
