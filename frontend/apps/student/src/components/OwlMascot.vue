<script setup lang="ts">
import owlDefault from '../assets/images/owl.png';
import owlCheering from '../assets/images/owl-cheering.png';
import owlChecking from '../assets/images/owl-checking.png';
import owlGuidance from '../assets/images/owl-guidance.png';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'cheering' | 'checking' | 'guidance';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'default',
});

const sizeClasses = {
  sm: 'w-28 h-28',
  md: 'w-36 h-36',
  lg: 'w-56 h-56',
  xl: 'w-72 h-72',
};

const variantImages: Record<string, string> = {
  default: owlDefault,
  cheering: owlCheering,
  checking: owlChecking,
  guidance: owlGuidance,
};
</script>

<template>
  <div :class="['relative flex items-center justify-center select-none shrink-0', sizeClasses[props.size]]">
    <!-- Outer ambient neon aura -->
    <div
      class="absolute inset-0 rounded-full blur-xl opacity-40 bg-gradient-to-tr from-cyan-500 via-blue-600 to-emerald-400"
    ></div>

    <!-- Owl Mascot Image -->
    <img
      :src="variantImages[props.variant]"
      alt="Owl Mascot"
      class="w-full h-full relative z-10 drop-shadow-[0_10px_20px_rgba(0,229,255,0.3)] object-contain"
    />
  </div>
</template>
