<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  FolderPlus,
  Layers,
  Settings2,
} from 'lucide-vue-next';
import AdminModal from '../components/AdminModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  api,
  toPersianDigits,
  type GuidanceCard,
  type GuidanceCategory,
} from '@student-reward/shared';

const categories = ref<GuidanceCategory[]>([]);
const cards = ref<GuidanceCard[]>([]);
const loading = ref(true);

const selectedCategoryFilter = ref<string>('ALL');

// Card Modal State
const isCardModalOpen = ref(false);
const editingCardId = ref<string | null>(null);
const cardTitle = ref('');
const cardDesc = ref('');
const cardCategoryId = ref('');
const cardLogoKey = ref('shield');
const cardPointRange = ref('۵۰ تا ۱۵۰ نوین');
const cardSortOrder = ref<number>(0);
const cardSaving = ref(false);

// Category Modal State
const isCategoryModalOpen = ref(false);
const editingCategoryId = ref<string | null>(null);
const categoryTitle = ref('');
const categoryIconKey = ref('graduation-cap');
const categorySortOrder = ref<number>(1);
const categorySaving = ref(false);

// Confirm Dialog State
const isConfirmOpen = ref(false);
const deleteType = ref<'card' | 'category'>('card');
const deleteTargetId = ref('');
const deleting = ref(false);

const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

function showSuccess(msg: string) {
  successMessage.value = msg;
  setTimeout(() => (successMessage.value = null), 3500);
}

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [catList, cardList] = await Promise.all([
      api.get<GuidanceCategory[]>('/guidance-categories'),
      api.get<GuidanceCard[]>('/guidance-cards'),
    ]);
    categories.value = catList || [];
    cards.value = cardList || [];
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در بارگذاری اطلاعات راهنما';
  } finally {
    loading.value = false;
  }
}

const filteredCards = computed(() => {
  if (selectedCategoryFilter.value === 'ALL') {
    return cards.value;
  }
  return cards.value.filter((c) => c.categoryId === selectedCategoryFilter.value);
});

// Category operations
function openCreateCategoryModal() {
  editingCategoryId.value = null;
  categoryTitle.value = '';
  categoryIconKey.value = 'graduation-cap';
  categorySortOrder.value = categories.value.length + 1;
  isCategoryModalOpen.value = true;
}

function openEditCategoryModal(cat: GuidanceCategory) {
  editingCategoryId.value = cat.id;
  categoryTitle.value = cat.title;
  categoryIconKey.value = cat.iconKey || 'graduation-cap';
  categorySortOrder.value = cat.sortOrder;
  isCategoryModalOpen.value = true;
}

async function handleSaveCategory() {
  if (!categoryTitle.value.trim()) return;

  categorySaving.value = true;
  try {
    if (editingCategoryId.value) {
      await api.patch(`/guidance-categories/${editingCategoryId.value}`, {
        title: categoryTitle.value.trim(),
        iconKey: categoryIconKey.value,
        sortOrder: Number(categorySortOrder.value) || 0,
      });
      showSuccess('دسته‌بندی با موفقیت ویرایش شد.');
    } else {
      await api.post('/guidance-categories', {
        title: categoryTitle.value.trim(),
        iconKey: categoryIconKey.value,
        sortOrder: Number(categorySortOrder.value) || 0,
      });
      showSuccess('دسته‌بندی جدید با موفقیت ایجاد شد.');
    }
    isCategoryModalOpen.value = false;
    await loadData();
  } catch (err: any) {
    alert(err.message || 'خطا در ذخیره دسته‌بندی');
  } finally {
    categorySaving.value = false;
  }
}

function askDeleteCategory(id: string) {
  deleteType.value = 'category';
  deleteTargetId.value = id;
  isConfirmOpen.value = true;
}

// Card operations
function openCreateCardModal() {
  editingCardId.value = null;
  cardTitle.value = '';
  cardDesc.value = '';
  cardCategoryId.value = categories.value[0]?.id || '';
  cardLogoKey.value = 'shield';
  cardPointRange.value = '۵۰ تا ۱۵۰ نوین';
  cardSortOrder.value = 0;
  isCardModalOpen.value = true;
}

function openEditCardModal(card: GuidanceCard) {
  editingCardId.value = card.id;
  cardTitle.value = card.title;
  cardDesc.value = card.description;
  cardCategoryId.value = card.categoryId;
  cardLogoKey.value = card.logoKey || 'shield';
  cardPointRange.value = card.pointRangeLabel;
  cardSortOrder.value = card.sortOrder || 0;
  isCardModalOpen.value = true;
}

async function handleSaveCard() {
  if (!cardTitle.value.trim() || !cardDesc.value.trim() || !cardCategoryId.value) return;

  cardSaving.value = true;
  try {
    if (editingCardId.value) {
      await api.patch(`/guidance-cards/${editingCardId.value}`, {
        title: cardTitle.value.trim(),
        description: cardDesc.value.trim(),
        categoryId: cardCategoryId.value,
        logoKey: cardLogoKey.value,
        pointRangeLabel: cardPointRange.value.trim(),
        sortOrder: Number(cardSortOrder.value) || 0,
      });
      showSuccess('کارت راهنما با موفقیت ویرایش شد.');
    } else {
      await api.post('/guidance-cards', {
        categoryId: cardCategoryId.value,
        title: cardTitle.value.trim(),
        description: cardDesc.value.trim(),
        logoKey: cardLogoKey.value,
        pointRangeLabel: cardPointRange.value.trim(),
        sortOrder: Number(cardSortOrder.value) || 0,
      });
      showSuccess('کارت راهنما با موفقیت ثبت شد.');
    }
    isCardModalOpen.value = false;
    await loadData();
  } catch (err: any) {
    alert(err.message || 'خطا در ذخیره کارت راهنما');
  } finally {
    cardSaving.value = false;
  }
}

function askDeleteCard(id: string) {
  deleteType.value = 'card';
  deleteTargetId.value = id;
  isConfirmOpen.value = true;
}

async function handleConfirmDelete() {
  deleting.value = true;
  try {
    if (deleteType.value === 'category') {
      await api.delete(`/guidance-categories/${deleteTargetId.value}`);
      showSuccess('دسته‌بندی با موفقیت حذف شد.');
    } else {
      await api.delete(`/guidance-cards/${deleteTargetId.value}`);
      showSuccess('کارت راهنما با موفقیت حذف شد.');
    }
    isConfirmOpen.value = false;
    await loadData();
  } catch (err: any) {
    alert(err.message || 'خطا در حذف آیتم');
  } finally {
    deleting.value = false;
  }
}

function getCategoryTitle(catId: string) {
  const cat = categories.value.find((c) => c.id === catId);
  return cat ? cat.title : 'دسته‌بندی نشده';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">راهنمای نوین و آیین‌نامه‌ها</h1>
        <p class="text-xs text-slate-500 mt-0.5">
          تنظیم دسته‌بندی‌ها و سرفصل‌های تشویقی نوین برای مشاهده دانش‌آموزان و معلمان
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <button
          class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="openCreateCategoryModal"
        >
          <FolderPlus class="w-4 h-4 text-slate-600" />
          <span>افزودن دسته‌بندی</span>
        </button>

        <button
          :disabled="categories.length === 0"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="openCreateCardModal"
        >
          <Plus class="w-4 h-4" />
          <span>افزودن کارت راهنما</span>
        </button>
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

    <div
      v-if="errorMessage"
      class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
    >
      <AlertCircle class="w-4 h-4 text-rose-600" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Categories Strip -->
    <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Layers class="w-4 h-4 text-slate-500" />
          <h2 class="text-xs font-extrabold text-slate-800">دسته‌بندی‌های فعال</h2>
          <span class="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {{ toPersianDigits(categories.length) }}
          </span>
        </div>
      </div>

      <div v-if="categories.length === 0" class="text-xs text-slate-400 py-2">
        هنوز دسته‌بندی‌ای ثبت نشده است. ابتدا یک دسته‌بندی ایجاد کنید تا بتوانید کارت‌های راهنما را به آن متصل نمایید.
      </div>

      <div v-else class="flex flex-wrap items-center gap-2">
        <button
          :class="[
            'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
            selectedCategoryFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          ]"
          @click="selectedCategoryFilter = 'ALL'"
        >
          همه ({{ toPersianDigits(cards.length) }})
        </button>

        <div
          v-for="cat in categories"
          :key="cat.id"
          :class="[
            'group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
            selectedCategoryFilter === cat.id
              ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
          ]"
        >
          <span class="cursor-pointer" @click="selectedCategoryFilter = cat.id">
            {{ cat.title }} ({{ toPersianDigits(cards.filter((c) => c.categoryId === cat.id).length) }})
          </span>
          <button
            class="opacity-60 group-hover:opacity-100 text-slate-400 hover:text-blue-600 p-0.5 transition-colors"
            title="ویرایش دسته‌بندی"
            @click.stop="openEditCategoryModal(cat)"
          >
            <Edit2 class="w-3 h-3" />
          </button>
          <button
            class="opacity-60 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 transition-colors"
            title="حذف دسته‌بندی"
            @click.stop="askDeleteCategory(cat.id)"
          >
            <Trash2 class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Cards Grid -->
    <div v-if="loading" class="py-16 text-center text-slate-400 text-xs">
      در حال دریافت کارت‌های راهنما...
    </div>

    <div v-else-if="filteredCards.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="c in filteredCards"
        :key="c.id"
        class="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
      >
        <div class="space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg mb-1.5">
                {{ getCategoryTitle(c.categoryId) }}
              </span>
              <h3 class="text-sm font-extrabold text-slate-800 leading-snug">{{ c.title }}</h3>
            </div>
            <div class="flex items-center gap-1">
              <button
                class="text-slate-400 hover:text-blue-600 p-1 rounded-lg transition-colors"
                title="ویرایش کارت"
                @click="openEditCardModal(c)"
              >
                <Edit2 class="w-4 h-4" />
              </button>
              <button
                class="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                title="حذف کارت"
                @click="askDeleteCard(c.id)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <p class="text-xs text-slate-500 leading-relaxed min-h-[44px]">{{ c.description }}</p>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl">
              {{ c.pointRangeLabel }}
            </span>
            <span class="text-[10px] text-slate-400 font-medium">ترتیب: {{ toPersianDigits(c.sortOrder || 0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200">
      کارتی در این بخش ثبت نشده است.
    </div>

    <!-- Modal: Category (Create / Edit) -->
    <AdminModal
      :is-open="isCategoryModalOpen"
      :title="editingCategoryId ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'"
      @close="isCategoryModalOpen = false"
    >
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">عنوان دسته‌بندی:</label>
          <input
            v-model="categoryTitle"
            type="text"
            maxlength="150"
            placeholder="مثال: فعالیت‌های آموزشی، فعالیت‌های انضباطی"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">شناسه آیکون:</label>
          <select
            v-model="categoryIconKey"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          >
            <option value="graduation-cap">آموزشی (Graduation Cap)</option>
            <option value="shield">انضباطی و رفتاری (Shield)</option>
            <option value="trophy">فرهنگی و ورزشی (Trophy)</option>
            <option value="star">امتیاز ویژه (Star)</option>
            <option value="book-open">پژوهشی (Book)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">ترتیب نمایش:</label>
          <input
            v-model.number="categorySortOrder"
            type="number"
            min="0"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
          @click="isCategoryModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="categorySaving || !categoryTitle.trim()"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold"
          @click="handleSaveCategory"
        >
          {{ editingCategoryId ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی' }}
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Card (Create / Edit) -->
    <AdminModal
      :is-open="isCardModalOpen"
      :title="editingCardId ? 'ویرایش کارت راهنما' : 'افزودن کارت راهنمای جدید'"
      @close="isCardModalOpen = false"
    >
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی مربوطه:</label>
          <select
            v-model="cardCategoryId"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          >
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.title }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">عنوان فعالیت (حداکثر ۱۵۰ کاراکتر):</label>
          <input
            v-model="cardTitle"
            type="text"
            maxlength="150"
            placeholder="مثال: شرکت فعال در مباحث درس"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">توضیحات تکمیلی:</label>
          <textarea
            v-model="cardDesc"
            rows="3"
            placeholder="شرایط و نحوه شایستگی برای دریافت نوین..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">برچسب بازه نوین پیشنهادی:</label>
          <input
            v-model="cardPointRange"
            type="text"
            placeholder="مثال: ۵۰ تا ۱۵۰ نوین"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">ترتیب نمایش در دسته:</label>
          <input
            v-model.number="cardSortOrder"
            type="number"
            min="0"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
          @click="isCardModalOpen = false"
        >
          انصراف
        </button>
        <button
          :disabled="cardSaving || !cardTitle.trim() || !cardDesc.trim() || !cardCategoryId"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold"
          @click="handleSaveCard"
        >
          {{ editingCardId ? 'ذخیره تغییرات' : 'ثبت کارت' }}
        </button>
      </template>
    </AdminModal>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :is-open="isConfirmOpen"
      :title="deleteType === 'category' ? 'حذف دسته‌بندی' : 'حذف کارت راهنما'"
      :message="
        deleteType === 'category'
          ? 'آیا از حذف این دسته‌بندی اطمینان دارید؟ کارت‌های درون این دسته‌بندی نیز غیرفعال می‌شوند.'
          : 'آیا از حذف این کارت راهنما اطمینان دارید؟'
      "
      :loading="deleting"
      is-destructive
      @confirm="handleConfirmDelete"
      @cancel="isConfirmOpen = false"
    />
  </div>
</template>

