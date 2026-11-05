<script setup lang="ts">
import { onUnmounted, watch } from 'vue';
import { AlertTriangle } from 'lucide-vue-next';
import { registerBackHandler } from '../services/mobileNavigation';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  cancelLabel: 'انصراف',
  loading: false,
});

const emit = defineEmits<{
  (event: 'confirm'): void;
  (event: 'cancel'): void;
}>();

let unregisterBack: (() => void) | null = null;

watch(
  () => props.isOpen,
  (open) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = open ? 'hidden' : '';
    }

    if (open && !unregisterBack) {
      unregisterBack = registerBackHandler(() => {
        if (!props.loading) {
          emit('cancel');
        }
        return true;
      });
    } else if (!open && unregisterBack) {
      unregisterBack();
      unregisterBack = null;
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
  unregisterBack?.();
  unregisterBack = null;
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-[#05070B]/80 p-4 backdrop-blur-md"
        role="presentation"
        dir="rtl"
        @click.self="!loading && emit('cancel')"
      >
        <section
          class="w-full max-w-sm rounded-3xl border border-neon-red/40 bg-[#121722] p-6 text-right shadow-[0_0_35px_rgba(255,61,0,0.2)]"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-neon-red/40 bg-neon-red/10 text-neon-red shadow-[0_0_18px_rgba(255,61,0,0.18)]">
            <AlertTriangle class="h-6 w-6" />
          </div>
          <h2 class="text-base font-extrabold text-white">
            {{ title }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-300">
            {{ message }}
          </p>
          <div class="mt-6 flex gap-2">
            <button
              type="button"
              class="flex-1 rounded-xl border border-slate-700 bg-[#1A2230] px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
              :disabled="loading"
              @click="emit('cancel')"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl bg-neon-red px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_0_16px_rgba(255,61,0,0.24)] transition-all hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
              :disabled="loading"
              @click="emit('confirm')"
            >
              {{ loading ? 'در حال انجام...' : confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
