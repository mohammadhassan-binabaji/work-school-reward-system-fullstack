<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Coins,
  RefreshCw,
  Clock,
  Lock,
} from 'lucide-vue-next';
import AdminModal from '../components/AdminModal.vue';
import {
  api,
  toPersianDigits,
  formatNovin,
  formatJalaliDateTime,
  type StudentTaskProposal,
  type TaskProposalMessage,
  type ProposalStatus,
} from '@student-reward/shared';

const proposals = ref<StudentTaskProposal[]>([]);
const loading = ref(true);
const filterStatus = ref<ProposalStatus | ''>('');

// Approve modal
const isApproveModalOpen = ref(false);
const approveTargetId = ref('');
const assignedPoints = ref<number | ''>(30);
const approving = ref(false);

// Decline modal
const isDeclineModalOpen = ref(false);
const declineTargetId = ref('');
const declineReason = ref('');
const declining = ref(false);

// Chat Modal
const isChatModalOpen = ref(false);
const activeProposal = ref<StudentTaskProposal | null>(null);
const messages = ref<TaskProposalMessage[]>([]);
const loadingMessages = ref(false);
const adminReply = ref('');
const sendingReply = ref(false);

const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadProposals();
});

async function loadProposals() {
  loading.value = true;
  try {
    const params: Record<string, any> = {};
    if (filterStatus.value) params.status = filterStatus.value;

    const list = await api.get<StudentTaskProposal[]>('/proposals', params);
    proposals.value = list || [];
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در بارگذاری پیشنهادها';
  } finally {
    loading.value = false;
  }
}

function openApproveModal(id: string, currentPoints?: number | null) {
  approveTargetId.value = id;
  assignedPoints.value = currentPoints || 30;
  isApproveModalOpen.value = true;
}

async function handleApprove() {
  if (assignedPoints.value === '' || assignedPoints.value <= 0) return;
  approving.value = true;
  try {
    await api.post(`/proposals/${approveTargetId.value}/approve`, {
      assignedPointValue: Number(assignedPoints.value),
    });
    isApproveModalOpen.value = false;
    successMessage.value = 'پیشنهاد با موفقیت تایید و ارزش نوین آن تعیین گردید.';
    await loadProposals();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در تایید پیشنهاد');
  } finally {
    approving.value = false;
  }
}

function openDeclineModal(id: string) {
  declineTargetId.value = id;
  declineReason.value = '';
  isDeclineModalOpen.value = true;
}

async function handleDecline() {
  if (!declineReason.value.trim()) return;
  declining.value = true;
  try {
    await api.post(`/proposals/${declineTargetId.value}/decline`, {
      declineReason: declineReason.value.trim(),
    });
    isDeclineModalOpen.value = false;
    successMessage.value = 'پیشنهاد رد شد.';
    await loadProposals();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در رد پیشنهاد');
  } finally {
    declining.value = false;
  }
}

async function handleComplete(id: string) {
  if (!confirm('آیا دانش‌آموز فعالیت را به اتمام رسانده و نوین به حسابش واریز شود؟')) return;
  try {
    await api.post(`/proposals/${id}/complete`);
    successMessage.value = 'فعالیت تکمیل شد و نوین تعیین‌شده به دانش‌آموز اهدا گردید.';
    await loadProposals();
    setTimeout(() => (successMessage.value = null), 3000);
  } catch (err: any) {
    alert(err.message || 'خطا در تکمیل پیشنهاد');
  }
}

async function openChat(p: StudentTaskProposal) {
  activeProposal.value = p;
  isChatModalOpen.value = true;
  adminReply.value = '';
  await fetchMessages(p.id);
}

async function fetchMessages(proposalId: string) {
  loadingMessages.value = true;
  try {
    const list = await api.get<TaskProposalMessage[]>(`/proposals/${proposalId}/messages`);
    messages.value = list || [];
  } catch (e) {
    console.error('Failed to load messages', e);
  } finally {
    loadingMessages.value = false;
  }
}

async function sendAdminMessage() {
  if (!activeProposal.value || !adminReply.value.trim()) return;
  sendingReply.value = true;
  try {
    await api.post(`/proposals/${activeProposal.value.id}/messages`, {
      message: adminReply.value.trim(),
    });
    adminReply.value = '';
    await fetchMessages(activeProposal.value.id);
  } catch (err: any) {
    alert(err.message || 'خطا در ارسال پیام');
  } finally {
    sendingReply.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">پیشنهادهای فعالیت دانش‌آموزان</h1>
        <p class="text-xs text-slate-500 mt-0.5">بررسی ایده‌ها، ارزش‌گذاری نوین، مکاتبه با دانش‌آموز و تایید اتمام کار</p>
      </div>

      <div class="flex items-center gap-2">
        <select
          v-model="filterStatus"
          class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium"
          @change="loadProposals"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="PENDING_TO_APPROVE">در انتظار بررسی اولیه</option>
          <option value="READY_TO_DO">تایید شده / آماده اجرا</option>
          <option value="COMPLETED">تکمیل شده و اهدای نوین</option>
          <option value="DECLINED">رد شده</option>
          <option value="CANCELED">لغو شده توسط دانش‌آموز</option>
        </select>
      </div>
    </div>

    <!-- Alert Notifications -->
    <div
      v-if="successMessage"
      class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
    >
      <CheckCircle2 class="w-4 h-4 text-emerald-600" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Proposals Table -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">دانش‌آموز</th>
              <th class="p-3.5">موضوع پیشنهاد</th>
              <th class="p-3.5">شرح فعالیت</th>
              <th class="p-3.5">نوین تعیین‌شده</th>
              <th class="p-3.5">وضعیت</th>
              <th class="p-3.5 pl-5 text-left">اقدام مدیر</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <template v-if="loading">
              <tr>
                <td colspan="6" class="py-12 text-center text-slate-400">در حال بارگذاری پیشنهادها...</td>
              </tr>
            </template>
            <template v-else-if="proposals.length > 0">
              <tr v-for="p in proposals" :key="p.id" class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3.5 pr-5 font-bold text-slate-800">
                  {{ p.student?.firstName }} {{ p.student?.lastName }}
                </td>
                <td class="p-3.5 font-bold text-slate-700">{{ p.title || 'پیشنهاد فعالیت' }}</td>
                <td class="p-3.5 text-slate-600 max-w-xs truncate">{{ p.description }}</td>
                <td class="p-3.5 font-black text-amber-600">
                  {{ p.assignedPointValue ? formatNovin(p.assignedPointValue) : 'هنوز تعیین نشده' }}
                </td>
                <td class="p-3.5">
                  <span
                    :class="[
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                      p.status === 'PENDING_TO_APPROVE'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : p.status === 'READY_TO_DO'
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : p.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200',
                    ]"
                  >
                    {{
                      p.status === 'PENDING_TO_APPROVE'
                        ? 'در انتظار بررسی'
                        : p.status === 'READY_TO_DO'
                        ? 'آماده اجرا'
                        : p.status === 'COMPLETED'
                        ? 'تکمیل شده'
                        : p.status === 'DECLINED'
                        ? 'رد شده'
                        : 'لغو شده'
                    }}
                  </span>
                </td>
                <td class="p-3.5 pl-5 text-left flex items-center justify-end gap-2">
                  <button
                    class="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1"
                    @click="openChat(p)"
                  >
                    <MessageSquare class="w-3.5 h-3.5 text-blue-600" />
                    <span>گفتگو</span>
                  </button>

                  <template v-if="p.status === 'PENDING_TO_APPROVE'">
                    <button
                      class="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      @click="openApproveModal(p.id)"
                    >
                      تایید و ارزش‌گذاری
                    </button>
                    <button
                      class="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs"
                      @click="openDeclineModal(p.id)"
                    >
                      رد
                    </button>
                  </template>

                  <template v-else-if="p.status === 'READY_TO_DO'">
                    <button
                      class="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1"
                      @click="handleComplete(p.id)"
                    >
                      <CheckCircle2 class="w-3.5 h-3.5" />
                      <span>تکمیل و پرداخت نوین</span>
                    </button>
                  </template>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="6" class="py-12 text-center text-slate-400">پیشنهادی یافت نشد.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Approve Proposal & Set Points -->
    <AdminModal :is-open="isApproveModalOpen" title="تایید پیشنهاد و ارزش‌گذاری نوین" @close="isApproveModalOpen = false">
      <div class="space-y-3.5">
        <p class="text-xs text-slate-600">
          با تایید پیشنهاد، دانش‌آموز مطلع شده و وضعیت به «آماده اجرا» تغییر می‌یابد.
        </p>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">ارزش پاداش نوین پیشنهادی:</label>
          <input
            v-model="assignedPoints"
            type="number"
            min="1"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-sans"
          />
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isApproveModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="approving || !assignedPoints"
          class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          @click="handleApprove"
        >
          تایید و تعیین نوین
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Decline Proposal -->
    <AdminModal :is-open="isDeclineModalOpen" title="رد پیشنهاد فعالیت" @close="isDeclineModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">علت رد پیشنهاد (الزامی):</label>
          <textarea
            v-model="declineReason"
            rows="3"
            placeholder="مثال: این فعالیت قبلاً انجام شده، موضوع نامناسب است..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-rose-600"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isDeclineModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="declining || !declineReason.trim()"
          class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
          @click="handleDecline"
        >
          ثبت رد پیشنهاد
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Messaging Thread -->
    <AdminModal :is-open="isChatModalOpen" :title="`گفتگو: ${activeProposal?.title || 'پیشنهاد'}`" max-width="max-w-lg" @close="isChatModalOpen = false">
      <div class="space-y-4">
        <!-- Student Request Summary -->
        <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <span class="font-bold block text-slate-800">درخواست اولیه دانش‌آموز:</span>
          <p>{{ activeProposal?.description }}</p>
        </div>

        <!-- Chat messages -->
        <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          <div v-if="loadingMessages" class="py-8 text-center text-xs text-slate-400">
            در حال بارگذاری پیام‌ها...
          </div>
          <template v-else-if="messages.length > 0">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="[
                'p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed',
                msg.senderRole === 'ADMIN'
                  ? 'mr-auto bg-blue-50 text-blue-900 border border-blue-200 rounded-br-none'
                  : 'ml-auto bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none',
              ]"
            >
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-[10px] font-bold opacity-75">
                  {{ msg.senderRole === 'ADMIN' ? 'مدیر سیستم' : 'دانش‌آموز' }}
                </span>
                <span class="text-[9px] opacity-60">
                  {{ formatJalaliDateTime(msg.createdAt) }}
                </span>
              </div>
              <p>{{ msg.message }}</p>
            </div>
          </template>
          <div v-else class="py-6 text-center text-slate-400 text-xs">
            پیامی ثبت نشده است.
          </div>
        </div>

        <!-- Reply Input -->
        <div class="pt-2 border-t border-slate-200 flex items-center gap-2">
          <input
            v-model="adminReply"
            type="text"
            placeholder="پاسخ خود را به دانش‌آموز بنویسید..."
            class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
            @keyup.enter="sendAdminMessage"
          />
          <button
            :disabled="sendingReply || !adminReply.trim()"
            class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
            @click="sendAdminMessage"
          >
            <Send class="w-3.5 h-3.5" />
            <span>ارسال</span>
          </button>
        </div>
      </div>
    </AdminModal>
  </div>
</template>
