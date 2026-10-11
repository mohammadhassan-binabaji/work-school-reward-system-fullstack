<script setup lang="ts">
import { AlertTriangle, RefreshCw } from 'lucide-vue-next';
import AdminModal from './AdminModal.vue';

interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'تایید عملیات',
  confirmLabel: 'تایید و ادامه',
  cancelLabel: 'انصراف',
  isDestructive: false,
  loading: false,
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <AdminModal :is-open="isOpen" :title="title" max-width="max-w-sm" @close="emit('cancel')">
    <div class="space-y-4 text-center py-2">
      <div
        :class="[
          'w-12 h-12 rounded-2xl mx-auto flex items-center justify-center',
          isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600',
        ]"
      >
        <AlertTriangle class="w-6 h-6" />
      </div>

      <p class="text-xs text-slate-600 leading-relaxed font-medium">
        {{ message }}
      </p>
    </div>

    <template #footer>
      <button
        type="button"
        class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
        :disabled="loading"
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </button>

      <button
        type="button"
        :disabled="loading"
        :class="[
          'px-4 py-2 rounded-xl text-xs font-extrabold text-white transition-all shadow-xs flex items-center gap-1.5',
          isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700',
        ]"
        @click="emit('confirm')"
      >
        <RefreshCw v-if="loading" class="w-3.5 h-3.5 animate-spin" />
        <span>{{ confirmLabel }}</span>
      </button>
    </template>
  </AdminModal>
</template>
