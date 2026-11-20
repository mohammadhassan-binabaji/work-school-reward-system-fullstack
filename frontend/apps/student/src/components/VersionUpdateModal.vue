<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue';
import {
  AlertTriangle,
  ChevronRight,
  Download,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Store,
  X,
} from 'lucide-vue-next';
import BottomSheet from './BottomSheet.vue';
import { useVersionStore } from '../stores/version';
import type { UpdateChannelId } from '../services/versionService';

type ChannelPresentation = {
  label: string;
  icon: Component;
  color: string;
};

const channelPresentation: Record<UpdateChannelId, ChannelPresentation> = {
  cafeBazaar: {
    label: 'کافه‌بازار',
    icon: Store,
    color: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  },
  myket: {
    label: 'مایکت',
    icon: ShoppingBag,
    color: 'text-violet-300 border-violet-400/30 bg-violet-400/10',
  },
  direct: {
    label: 'دریافت مستقیم',
    icon: Download,
    color: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  },
};

const versionStore = useVersionStore();
const isMandatory = computed(() => versionStore.isMandatoryUpdate);
const isOptional = computed(() => versionStore.isOptionalUpdate);
const hasError = computed(() => versionStore.hasError && !versionStore.isChecking);
const result = computed(() => versionStore.result);
const releaseNotes = computed(() => result.value?.releaseNotes ?? []);
const channels = computed(() => result.value?.channels ?? []);

const isOptionalSheetOpen = ref(false);
const optionalSheetStep = ref<'notes' | 'channels'>('notes');
const mandatoryStep = ref<'notes' | 'channels'>('notes');

watch(isMandatory, (active) => {
  if (active) {
    mandatoryStep.value = 'notes';
  }
});

const optionalSheetTitle = computed(() =>
  optionalSheetStep.value === 'notes' ? 'جزئیات به‌روزرسانی' : 'انتخاب محل دریافت',
);

function openOptionalSheet() {
  optionalSheetStep.value = 'notes';
  isOptionalSheetOpen.value = true;
}

function closeOptionalSheet() {
  isOptionalSheetOpen.value = false;
  optionalSheetStep.value = 'notes';
}

function onDismissOptional() {
  closeOptionalSheet();
  versionStore.dismissOptionalUpdate();
}

function onSelectChannel(channelId: UpdateChannelId) {
  versionStore.performUpdate(channelId);
}

function onRetry() {
  void versionStore.checkVersion();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isMandatory"
      class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0A0E1A] p-5 text-center"
      dir="rtl"
    >
      <section
        class="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-3xl border-2 border-neon-red/60 bg-[#121722] p-6 shadow-[0_0_40px_rgba(255,61,0,0.3)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mandatory-update-title"
      >
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-neon-red/40 bg-neon-red/10 text-neon-red shadow-[0_0_20px_rgba(255,61,0,0.2)]">
          <ShieldAlert class="h-9 w-9" />
        </div>

        <template v-if="mandatoryStep === 'notes'">
          <h2 id="mandatory-update-title" class="mb-2 text-xl font-bold text-white">
            به‌روزرسانی الزامی برنامه
          </h2>
          <p class="mb-4 text-sm leading-relaxed text-slate-300">
            {{
              result?.message ||
              'برای ادامه استفاده از سامانه پاداش دانش‌آموزی، نصب نسخه جدید الزامی است.'
            }}
          </p>

          <div class="mb-4 flex w-full justify-around rounded-xl border border-slate-800 bg-[#0B0E14] p-3 text-xs">
            <div class="text-slate-400">
              نسخه فعلی شما:
              <span class="mt-1 block font-mono font-bold text-neon-red">
                {{ result?.installedVersion }}
              </span>
            </div>
            <div class="w-px bg-slate-800"></div>
            <div class="text-slate-400">
              حداقل نسخه مجاز:
              <span class="mt-1 block font-mono font-bold text-neon-green">
                {{ result?.minimumVersion }}
              </span>
            </div>
            <div class="w-px bg-slate-800"></div>
            <div class="text-slate-400">
              نسخه قابل دریافت:
              <span class="mt-1 block font-mono font-bold text-neon-cyan">
                {{ result?.latestVersion }}
              </span>
            </div>
          </div>

          <details class="mb-5 rounded-xl border border-slate-800 bg-[#0B0E14] text-right">
            <summary class="cursor-pointer rounded-xl px-4 py-3 text-sm font-bold text-neon-cyan">
              یادداشت انتشار
            </summary>
            <div class="space-y-4 px-4 pb-4 text-sm leading-6 text-slate-300">
              <p v-if="releaseNotes.length === 0" class="text-slate-400">
                برای این نسخه یادداشت انتشاری ثبت نشده است.
              </p>
              <section v-for="release in releaseNotes" :key="release.version">
                <h3 class="mb-1 font-mono text-xs font-bold text-neon-cyan">
                  نسخه {{ release.version }}
                </h3>
                <ul class="list-inside list-disc space-y-1">
                  <li v-for="(note, index) in release.notes" :key="`${release.version}-${index}`">
                    {{ note }}
                  </li>
                </ul>
              </section>
            </div>
          </details>

          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-neon-red px-4 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(255,61,0,0.4)] transition-all hover:brightness-110 active:scale-95"
            @click="mandatoryStep = 'channels'"
          >
            <Download class="h-5 w-5" />
            <span>انتخاب محل دریافت</span>
          </button>
        </template>

        <template v-else>
          <div class="mb-5 flex items-center justify-between">
            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 transition-colors hover:text-white"
              aria-label="بازگشت به یادداشت انتشار"
              @click="mandatoryStep = 'notes'"
            >
              <ChevronRight class="h-5 w-5" />
            </button>
            <h2 id="mandatory-update-title" class="text-base font-bold text-white">
              انتخاب محل دریافت
            </h2>
            <span class="w-9"></span>
          </div>
          <p class="mb-4 text-sm text-slate-300">
            نسخه {{ result?.latestVersion }} را از یکی از مسیرهای زیر دریافت کنید.
          </p>
          <div class="space-y-3">
            <button
              v-for="channel in channels"
              :key="channel.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border bg-[#0B0E14] p-4 text-right transition-all hover:brightness-110 active:scale-[0.98]"
              :class="channelPresentation[channel.id].color"
              @click="onSelectChannel(channel.id)"
            >
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-current/20">
                <component :is="channelPresentation[channel.id].icon" class="h-5 w-5" />
              </span>
              <span class="flex-1 font-bold text-white">
                {{ channelPresentation[channel.id].label }}
              </span>
              <ChevronRight class="h-5 w-5 rotate-180 text-slate-400" />
            </button>
          </div>
        </template>
      </section>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="isOptional && !isMandatory"
      class="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md rounded-2xl border border-neon-cyan/40 bg-[#121722]/95 p-4 shadow-[0_4px_25px_rgba(0,229,255,0.2)] backdrop-blur-md"
      dir="rtl"
    >
      <div class="flex items-start gap-3">
        <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Download class="h-5 w-5" />
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold text-white">نسخه جدید در دسترس است</h2>
            <button
              type="button"
              class="p-1 text-slate-400 hover:text-white"
              aria-label="بستن اعلان به‌روزرسانی"
              @click="onDismissOptional"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <p class="mt-1 text-xs text-slate-300">
            نسخه {{ result?.latestVersion }} منتشر شده است.
          </p>
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg bg-neon-cyan px-3 py-1.5 text-xs font-bold text-black transition-all hover:brightness-110 active:scale-95"
              @click="openOptionalSheet"
            >
              <Download class="h-3.5 w-3.5" />
              <span>جزئیات و به‌روزرسانی</span>
            </button>
            <button
              type="button"
              class="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:text-white"
              @click="onDismissOptional"
            >
              بعداً
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <BottomSheet
    :is-open="isOptionalSheetOpen"
    :title="optionalSheetTitle"
    border-color="cyan"
    @close="closeOptionalSheet"
  >
    <div v-if="optionalSheetStep === 'notes'" dir="rtl">
      <p class="mb-4 text-sm leading-6 text-slate-300">
        نسخه {{ result?.latestVersion }} در دسترس است.
      </p>
      <details class="rounded-xl border border-slate-800 bg-[#0B0E14] text-right">
        <summary class="cursor-pointer px-4 py-3 text-sm font-bold text-neon-cyan">
          یادداشت انتشار
        </summary>
        <div class="space-y-4 px-4 pb-4 text-sm leading-6 text-slate-300">
          <p v-if="releaseNotes.length === 0" class="text-slate-400">
            برای این نسخه یادداشت انتشاری ثبت نشده است.
          </p>
          <section v-for="release in releaseNotes" :key="release.version">
            <h3 class="mb-1 font-mono text-xs font-bold text-neon-cyan">
              نسخه {{ release.version }}
            </h3>
            <ul class="list-inside list-disc space-y-1">
              <li v-for="(note, index) in release.notes" :key="`${release.version}-${index}`">
                {{ note }}
              </li>
            </ul>
          </section>
        </div>
      </details>
    </div>

    <div v-else class="space-y-3" dir="rtl">
      <p class="mb-4 text-sm leading-6 text-slate-300">
        نسخه {{ result?.latestVersion }} را از یکی از مسیرهای زیر دریافت کنید.
      </p>
      <button
        v-for="channel in channels"
        :key="channel.id"
        type="button"
        class="flex w-full items-center gap-3 rounded-xl border bg-[#0B0E14] p-4 text-right transition-all hover:brightness-110 active:scale-[0.98]"
        :class="channelPresentation[channel.id].color"
        @click="onSelectChannel(channel.id)"
      >
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-current/20">
          <component :is="channelPresentation[channel.id].icon" class="h-5 w-5" />
        </span>
        <span class="flex-1 font-bold text-white">
          {{ channelPresentation[channel.id].label }}
        </span>
        <ChevronRight class="h-5 w-5 rotate-180 text-slate-400" />
      </button>
    </div>

    <template #footer>
      <button
        v-if="optionalSheetStep === 'notes'"
        type="button"
        class="w-full rounded-xl bg-neon-cyan px-4 py-3 text-sm font-bold text-black transition-all hover:brightness-110 active:scale-95"
        @click="optionalSheetStep = 'channels'"
      >
        انتخاب محل دریافت
      </button>
      <button
        v-else
        type="button"
        class="w-full rounded-xl border border-slate-700 bg-[#1A2230] px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800"
        @click="optionalSheetStep = 'notes'"
      >
        بازگشت به یادداشت‌ها
      </button>
    </template>
  </BottomSheet>

  <Teleport to="body">
    <div
      v-if="hasError && !isMandatory"
      class="fixed inset-x-4 top-3 z-40 mx-auto flex max-w-md items-center justify-between rounded-xl border border-amber-600/40 bg-amber-950/90 p-3 text-xs text-amber-200 shadow-lg"
      dir="rtl"
    >
      <div class="flex items-center gap-2">
        <AlertTriangle class="h-4 w-4 shrink-0 text-amber-400" />
        <span>عدم دسترسی به سرور نسخه.</span>
      </div>
      <button
        type="button"
        class="flex items-center gap-1 rounded-lg bg-amber-800/80 px-2.5 py-1 font-medium text-white transition-colors hover:bg-amber-700"
        @click="onRetry"
      >
        <RefreshCw class="h-3 w-3" />
        <span>تلاش مجدد</span>
      </button>
    </div>
  </Teleport>
</template>
