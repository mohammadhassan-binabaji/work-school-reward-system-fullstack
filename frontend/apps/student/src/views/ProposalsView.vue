<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Send,
  MessageSquare,
  Lock,
  RefreshCw,
  AlertCircle,
  XCircle,
  Coins,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import BottomSheet from '../components/BottomSheet.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatJalaliDateTime,
  type StudentTaskProposal,
  type TaskProposalMessage,
  type ProposalStatus,
} from '@student-reward/shared';

const authStore = useAuthStore();

// Proposals list state
const proposals = ref<StudentTaskProposal[]>([]);
const loading = ref(true);

// New Proposal Form State
const title = ref('');
const description = ref('');
const submitting = ref(false);
const submitError = ref<string | null>(null);
const submitSuccess = ref(false);

// Chat Bottom Sheet Modal State
const isChatOpen = ref(false);
const activeProposal = ref<StudentTaskProposal | null>(null);
const messages = ref<TaskProposalMessage[]>([]);
const loadingMessages = ref(false);
const newMessageText = ref('');
const sendingMessage = ref(false);
const messageError = ref<string | null>(null);

onMounted(async () => {
  await fetchProposals();
});

async function fetchProposals() {
  loading.value = true;
  try {
    const list = await api.get<StudentTaskProposal[]>('/proposals');
    proposals.value = list || [];
  } catch (e) {
    console.error('Failed to load proposals', e);
  } finally {
    loading.value = false;
  }
}

async function handleCreateProposal() {
  if (!title.value.trim() || !description.value.trim()) {
    submitError.value = 'لطفاً عنوان و متن درخواست خود را کامل کنید.';
    return;
  }

  submitting.value = true;
  submitError.value = null;

  try {
    await api.post('/proposals', {
      title: title.value.trim(),
      description: description.value.trim(),
    });

    submitSuccess.value = true;
    title.value = '';
    description.value = '';
    setTimeout(() => {
      submitSuccess.value = false;
      fetchProposals();
    }, 1200);
  } catch (err: any) {
    submitError.value = err.message || 'ثبت پیشنهاد با خطا مواجه شد';
  } finally {
    submitting.value = false;
  }
}

async function handleCancelProposal(p: StudentTaskProposal, event: Event) {
  event.stopPropagation();
  if (!confirm('آیا از لغو این فعالیت پیشنهادی اطمینان دارید؟')) return;

  try {
    await api.post(`/proposals/${p.id}/cancel`);
    await fetchProposals();
  } catch (err: any) {
    alert(err.message || 'لغو پیشنهاد با خطا مواجه شد');
  }
}

async function openChat(p: StudentTaskProposal) {
  activeProposal.value = p;
  isChatOpen.value = true;
  newMessageText.value = '';
  messageError.value = null;
  await fetchMessages(p.id);
}

async function fetchMessages(proposalId: string) {
  loadingMessages.value = true;
  try {
    const res = await api.get<TaskProposalMessage[]>(`/proposals/${proposalId}/messages`);
    messages.value = res || [];
  } catch (e) {
    console.error('Failed to fetch messages', e);
  } finally {
    loadingMessages.value = false;
  }
}

async function sendMessage() {
  if (!activeProposal.value || !newMessageText.value.trim()) return;

  sendingMessage.value = true;
  messageError.value = null;

  try {
    await api.post(`/proposals/${activeProposal.value.id}/messages`, {
      message: newMessageText.value.trim(),
    });
    newMessageText.value = '';
    await fetchMessages(activeProposal.value.id);
  } catch (err: any) {
    messageError.value = err.message || 'ارسال پیام با خطا مواجه شد';
  } finally {
    sendingMessage.value = false;
  }
}

const isChatActive = computed(() => {
  if (!activeProposal.value) return false;
  return (
    activeProposal.value.status === 'PENDING_TO_APPROVE' ||
    activeProposal.value.status === 'READY_TO_DO'
  );
});

function getStatusBadge(status: ProposalStatus): { text: string; bg: string; color: string; border: string } {
  switch (status) {
    case 'PENDING_TO_APPROVE':
      return {
        text: 'در انتظار تایید',
        bg: 'bg-amber-500/15',
        color: 'text-amber-400',
        border: 'border-amber-500/40',
      };
    case 'READY_TO_DO':
      return {
        text: 'آماده اجرا',
        bg: 'bg-cyan-500/15',
        color: 'text-cyan-400',
        border: 'border-cyan-500/40',
      };
    case 'COMPLETED':
      return {
        text: 'تکمیل شده',
        bg: 'bg-emerald-500/15',
        color: 'text-emerald-400',
        border: 'border-emerald-500/40',
      };
    case 'DECLINED':
      return {
        text: 'رد شده',
        bg: 'bg-rose-500/15',
        color: 'text-rose-400',
        border: 'border-rose-500/40',
      };
    case 'CANCELED':
    default:
      return {
        text: 'لغو شده',
        bg: 'bg-slate-700/30',
        color: 'text-slate-400',
        border: 'border-slate-700',
      };
  }
}
</script>

<template>
  <div class="space-y-4 pb-24 pt-2">
    <!-- Informational Banner -->
    <div class="bg-dark-card rounded-3xl p-5 border-1.5 neon-border-cyan relative overflow-hidden">
      <div class="space-y-1.5">
        <h2 class="text-base font-extrabold text-white flex items-center gap-2">
          <Send class="w-5 h-5 text-neon-cyan" />
          <span>پیشنهاد فعالیت داوطلبانه</span>
        </h2>
        <p class="text-xs text-slate-300 leading-relaxed">
          ایده‌ها و فعالیت‌های داوطلبانه خود را ثبت کنید. پس از بررسی مدیر و تعیین نوین، می‌توانید آن را انجام داده و پاداش بگیرید.
        </p>
      </div>
    </div>

    <!-- New Proposal Form -->
    <div class="bg-dark-card rounded-3xl p-5 border-1.5 neon-border-green space-y-3.5">
      <h3 class="text-xs font-bold text-slate-300">ثبت پیشنهاد جدید</h3>

      <div>
        <label class="block text-[11px] font-bold text-slate-400 mb-1">موضوع پیشنهاد:</label>
        <input
          v-model="title"
          type="text"
          placeholder="مثال: پاکسازی حیاط مدرسه، برگزاری نمایشگاه..."
          class="w-full bg-[#0F1420] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-green transition-colors"
        />
      </div>

      <div>
        <label class="block text-[11px] font-bold text-slate-400 mb-1">درخواست و شرح فعالیت:</label>
        <textarea
          v-model="description"
          rows="3"
          placeholder="توضیح دهید چه کاری می‌خواهید انجام دهید و چه فایده‌ای دارد..."
          class="w-full bg-[#0F1420] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-green transition-colors leading-relaxed"
        ></textarea>
      </div>

      <!-- Alerts -->
      <div
        v-if="submitError"
        class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5"
      >
        <AlertCircle class="w-4 h-4 shrink-0" />
        <span>{{ submitError }}</span>
      </div>

      <div
        v-if="submitSuccess"
        class="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold"
      >
        پیشنهاد شما با موفقیت ثبت شد!
      </div>

      <button
        :disabled="submitting || submitSuccess"
        class="w-full py-2.5 rounded-xl bg-neon-green text-[#0B0E14] font-extrabold text-xs shadow-neon-green disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        @click="handleCreateProposal"
      >
        <RefreshCw v-if="submitting" class="w-4 h-4 animate-spin" />
        <span>{{ submitting ? 'در حال ارسال...' : 'ارسال پیشنهاد فعالیت' }}</span>
      </button>
    </div>

    <!-- Section Heading -->
    <div class="px-1 pt-2">
      <h3 class="text-xs font-bold text-slate-400">درخواست‌های ثبت‌شده شما</h3>
    </div>

    <!-- Proposals List -->
    <div v-if="loading" class="py-12 text-center text-slate-400 text-xs">
      در حال بارگذاری پیشنهادها...
    </div>

    <div v-else-if="proposals.length > 0" class="space-y-3">
      <div
        v-for="p in proposals"
        :key="p.id"
        class="bg-dark-card rounded-3xl p-4.5 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer relative"
        @click="openChat(p)"
      >
        <!-- Header row: Title (Right) and Assigned Points (Left) -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <h4 class="text-sm font-extrabold text-white line-clamp-1">
              {{ p.title || 'فعالیت پیشنهادی' }}
            </h4>
            <span class="text-[10px] text-slate-400 block mt-0.5">
              {{ formatJalaliDateTime(p.createdAt) }}
            </span>
          </div>

          <!-- Points Badge if assigned -->
          <div
            v-if="p.assignedPointValue"
            class="bg-neon-gold/15 border border-neon-gold/40 px-2.5 py-1 rounded-xl text-xs font-extrabold text-neon-gold flex items-center gap-1 shrink-0"
          >
            <Coins class="w-3.5 h-3.5" />
            <span>{{ formatNovin(p.assignedPointValue) }}</span>
          </div>
        </div>

        <!-- Description (Truncated) -->
        <p class="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
          {{ p.description }}
        </p>

        <!-- Decline Reason note if declined -->
        <div
          v-if="p.status === 'DECLINED' && p.declineReason"
          class="mt-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]"
        >
          علت رد: {{ p.declineReason }}
        </div>

        <!-- Footer row: Status Badge & Chat affordance -->
        <div class="mt-3.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              :class="[
                'text-[10px] font-bold px-2.5 py-1 rounded-full border',
                getStatusBadge(p.status).bg,
                getStatusBadge(p.status).color,
                getStatusBadge(p.status).border,
              ]"
            >
              {{ getStatusBadge(p.status).text }}
            </span>

            <!-- Cancel Button strictly for READY_TO_DO -->
            <button
              v-if="p.status === 'READY_TO_DO'"
              class="text-[10px] font-bold text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded-lg border border-rose-500/30 bg-rose-500/10 transition-colors flex items-center gap-1"
              @click="(e) => handleCancelProposal(p, e)"
            >
              <XCircle class="w-3 h-3" />
              <span>انصراف</span>
            </button>
          </div>

          <div class="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-semibold">
            <MessageSquare class="w-3.5 h-3.5 text-neon-cyan" />
            <span>گفتگو</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-12 text-center text-slate-500 text-xs">
      شما تاکنون پیشنهادی ثبت نکرده‌اید.
    </div>

    <!-- Bottom Sheet: Messaging Modal -->
    <BottomSheet
      :is-open="isChatOpen"
      :title="activeProposal?.title || 'گفتگوی فعالیت پیشنهادی'"
      border-color="cyan"
      @close="isChatOpen = false"
    >
      <div class="flex flex-col h-full space-y-4">
        <!-- Proposal Summary Card (Immutable) -->
        <div class="p-3.5 rounded-2xl bg-[#161C28] border border-slate-700/80 space-y-2 shrink-0">
          <div class="flex items-center justify-between">
            <span
              v-if="activeProposal"
              :class="[
                'text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                getStatusBadge(activeProposal.status).bg,
                getStatusBadge(activeProposal.status).color,
                getStatusBadge(activeProposal.status).border,
              ]"
            >
              {{ getStatusBadge(activeProposal.status).text }}
            </span>

            <span v-if="activeProposal?.assignedPointValue" class="text-xs font-bold text-neon-gold">
              {{ formatNovin(activeProposal.assignedPointValue) }}
            </span>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed font-medium">
            {{ activeProposal?.description }}
          </p>
        </div>

        <!-- Chat Messages Thread -->
        <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          <div v-if="loadingMessages" class="py-8 text-center text-slate-400 text-xs">
            در حال بارگذاری پیام‌ها...
          </div>

          <template v-else-if="messages.length > 0">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="[
                'p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed',
                msg.senderRole === 'STUDENT'
                  ? 'mr-auto bg-neon-cyan/15 text-cyan-200 border border-neon-cyan/30 rounded-br-none'
                  : 'ml-auto bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none',
              ]"
            >
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-[10px] font-extrabold opacity-80">
                  {{ msg.senderRole === 'STUDENT' ? 'شما' : 'مدیر سیستم' }}
                </span>
                <span class="text-[9px] opacity-60">
                  {{ formatJalaliDateTime(msg.createdAt).split('ساعت')[1] || '' }}
                </span>
              </div>
              <p>{{ msg.message }}</p>
            </div>
          </template>

          <div v-else class="py-6 text-center text-slate-500 text-xs">
            هنوز پیامی در این گفتگو رد و بدل نشده است.
          </div>
        </div>

        <!-- Lifecycle Gating Footer -->
        <!-- Active states: Sticky message input -->
        <div v-if="isChatActive" class="pt-2 border-t border-slate-800 space-y-2">
          <div class="flex items-center gap-2">
            <input
              v-model="newMessageText"
              type="text"
              placeholder="پیام خود را بنویسید..."
              class="flex-1 bg-[#0F1420] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan"
              @keyup.enter="sendMessage"
            />
            <button
              :disabled="sendingMessage || !newMessageText.trim()"
              class="p-2.5 rounded-xl bg-neon-cyan text-[#0B0E14] hover:bg-neon-cyan-light shadow-neon-cyan disabled:opacity-50 transition-all"
              @click="sendMessage"
            >
              <Send class="w-4 h-4" />
            </button>
          </div>
          <p v-if="messageError" class="text-[10px] text-rose-400">{{ messageError }}</p>
        </div>

        <!-- Terminal states: Thread Closed Notice -->
        <div
          v-else
          class="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center gap-2 text-slate-400 text-xs font-bold"
        >
          <Lock class="w-4 h-4" />
          <span>گفتگو برای این درخواست بسته شده است 🔒</span>
        </div>
      </div>
    </BottomSheet>
  </div>
</template>
