<script setup lang="ts">
import { watch, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import { registerBackHandler } from '../services/mobileNavigation';

interface Props {
  isOpen: boolean;
  title?: string;
  borderColor?: 'green' | 'red' | 'cyan' | 'gold' | 'default';
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  title: '',
  borderColor: 'default',
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

let unregisterBack: (() => void) | null = null;

watch(
  () => props.isOpen,
  (open) => {
    if (typeof document !== 'undefined') {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }

    if (open) {
      if (!unregisterBack) {
        unregisterBack = registerBackHandler(() => {
          emit('close');
          return true;
        });
      }
    } else {
      if (unregisterBack) {
        unregisterBack();
        unregisterBack = null;
      }
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
  if (unregisterBack) {
    unregisterBack();
    unregisterBack = null;
  }
});

const borderStyles = {
  green: 'border-t-2 border-neon-green/60 shadow-[0_-8px_25px_rgba(100,221,23,0.25)]',
  red: 'border-t-2 border-neon-red/60 shadow-[0_-8px_25px_rgba(255,61,0,0.25)]',
  cyan: 'border-t-2 border-neon-cyan/60 shadow-[0_-8px_25px_rgba(0,229,255,0.25)]',
  gold: 'border-t-2 border-neon-gold/60 shadow-[0_-8px_25px_rgba(255,214,0,0.25)]',
  default: 'border-t border-slate-700 shadow-2xl',
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 bg-[#0A0E1A]/80 backdrop-blur-md transition-all"
        @click="emit('close')"
      ></div>
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="isOpen"
        :class="[
          'fixed inset-x-0 bottom-0 z-50 max-h-[90vh] flex flex-col bg-[#121722] rounded-t-3xl max-w-lg mx-auto',
          borderStyles[props.borderColor],
        ]"
      >
        <!-- Top Drag Handle -->
        <div class="pt-3 pb-2 flex justify-center cursor-pointer" @click="emit('close')">
          <div class="w-12 h-1.5 bg-slate-600 rounded-full"></div>
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <h3 class="text-base font-bold text-white tracking-wide">
            {{ title }}
          </h3>
          <button
            class="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
          <slot></slot>
        </div>

        <!-- Optional Footer / Action Area -->
        <div v-if="$slots.footer" class="p-4 border-t border-slate-800 bg-[#0E131D] rounded-b-none">
          <slot name="footer"></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
