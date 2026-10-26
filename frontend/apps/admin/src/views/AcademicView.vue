<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  GraduationCap,
  BookOpen,
  Users,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  UserX,
} from 'lucide-vue-next';
import AdminModal from '../components/AdminModal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import {
  api,
  toPersianDigits,
  type Class,
  type Subject,
  type TeacherAssignment,
  type User,
} from '@student-reward/shared';

const activeTab = ref<'classes' | 'subjects' | 'assignments'>('classes');
const loading = ref(true);

const classes = ref<Class[]>([]);
const subjects = ref<Subject[]>([]);
const assignments = ref<TeacherAssignment[]>([]);
const teachers = ref<User[]>([]);
const students = ref<User[]>([]);

// Class modal
const isClassModalOpen = ref(false);
const className = ref('');
const classGrade = ref('');
const classDesc = ref('');
const savingClass = ref(false);

// Edit Class modal
const isEditClassModalOpen = ref(false);
const editingClassId = ref('');
const editClassName = ref('');
const editClassGrade = ref('');
const editClassDesc = ref('');
const editClassActive = ref(true);
const savingEditClass = ref(false);

// Subject modal
const isSubjectModalOpen = ref(false);
const subjectName = ref('');
const subjectDesc = ref('');
const savingSubject = ref(false);

// Edit Subject modal
const isEditSubjectModalOpen = ref(false);
const editingSubjectId = ref('');
const editSubjectName = ref('');
const editSubjectDesc = ref('');
const savingEditSubject = ref(false);

// Assignment modal
const isAssignModalOpen = ref(false);
const assignTeacherId = ref('');
const assignClassId = ref('');
const assignSubjectId = ref('');
const savingAssign = ref(false);

// Student to Class Assign Modal
const isStudentAssignModalOpen = ref(false);
const targetStudentId = ref('');
const targetClassId = ref('');
const savingStudentAssign = ref(false);

// Confirm Dialog
const isConfirmOpen = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref<() => Promise<void>>(() => Promise.resolve());
const confirmLoading = ref(false);

const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [cList, sList, aList, uList] = await Promise.all([
      api.get<Class[]>('/classes'),
      api.get<Subject[]>('/subjects'),
      api.get<TeacherAssignment[]>('/assignments'),
      api.get<User[]>('/users'),
    ]);
    classes.value = cList || [];
    subjects.value = sList || [];
    assignments.value = aList || [];
    teachers.value = (uList || []).filter((u) => u.role === 'TEACHER');
    students.value = (uList || []).filter((u) => u.role === 'STUDENT');
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در بارگذاری ساختار آموزشی';
  } finally {
    loading.value = false;
  }
}

async function handleCreateClass() {
  if (!className.value.trim()) return;
  savingClass.value = true;
  try {
    await api.post('/classes', {
      name: className.value.trim(),
      gradeLevel: classGrade.value.trim() || undefined,
      description: classDesc.value.trim() || undefined,
    });
    isClassModalOpen.value = false;
    className.value = '';
    classGrade.value = '';
    classDesc.value = '';
    await loadData();
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در ایجاد کلاس';
  } finally {
    savingClass.value = false;
  }
}

async function handleCreateSubject() {
  if (!subjectName.value.trim()) return;
  savingSubject.value = true;
  try {
    await api.post('/subjects', {
      name: subjectName.value.trim(),
      description: subjectDesc.value.trim() || undefined,
    });
    isSubjectModalOpen.value = false;
    subjectName.value = '';
    subjectDesc.value = '';
    await loadData();
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در ایجاد درس';
  } finally {
    savingSubject.value = false;
  }
}

async function handleCreateAssignment() {
  if (!assignTeacherId.value || !assignClassId.value || !assignSubjectId.value) return;
  savingAssign.value = true;
  try {
    await api.post('/assignments', {
      teacherId: assignTeacherId.value,
      classId: assignClassId.value,
      subjectId: assignSubjectId.value,
    });
    isAssignModalOpen.value = false;
    assignTeacherId.value = '';
    assignClassId.value = '';
    assignSubjectId.value = '';
    await loadData();
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در تخصیص تدریس';
  } finally {
    savingAssign.value = false;
  }
}

async function handleAssignStudentToClass() {
  if (!targetStudentId.value || !targetClassId.value) return;
  savingStudentAssign.value = true;
  try {
    await api.post('/classes/assign-student', {
      studentId: targetStudentId.value,
      classId: targetClassId.value,
    });
    isStudentAssignModalOpen.value = false;
    targetStudentId.value = '';
    targetClassId.value = '';
    await loadData();
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در انتساب دانش‌آموز به کلاس';
  } finally {
    savingStudentAssign.value = false;
  }
}

function askDeleteAssignment(id: string) {
  confirmTitle.value = 'حذف انتساب تدریس';
  confirmMessage.value = 'آیا از حذف این انتساب اطمینان دارید؟';
  confirmAction.value = async () => {
    confirmLoading.value = true;
    try {
      await api.delete(`/assignments/${id}`);
      isConfirmOpen.value = false;
      await loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در حذف انتساب');
    } finally {
      confirmLoading.value = false;
    }
  };
  isConfirmOpen.value = true;
}

function askDepartTeacher(teacherId: string, teacherName: string) {
  confirmTitle.value = 'ثبت خروج معلم و بازگشت بودجه';
  confirmMessage.value = `آیا از ثبت خروج معلم (${teacherName}) و بازگرداندن بودجه باقی‌مانده نوین به استخر اطمینان دارید؟`;
  confirmAction.value = async () => {
    confirmLoading.value = true;
    try {
      await api.post(`/assignments/teachers/${teacherId}/depart`);
      isConfirmOpen.value = false;
      await loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت خروج معلم');
    } finally {
      confirmLoading.value = false;
    }
  };
  isConfirmOpen.value = true;
}

function askDepartStudent(studentId: string, studentName: string) {
  confirmTitle.value = 'ثبت خروج دانش‌آموز';
  confirmMessage.value = `آیا از ثبت خروج دانش‌آموز (${studentName}) و تسویه رکوردهای مربوطه اطمینان دارید؟`;
  confirmAction.value = async () => {
    confirmLoading.value = true;
    try {
      await api.post(`/classes/students/${studentId}/depart`);
      isConfirmOpen.value = false;
      await loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در ثبت خروج دانش‌آموز');
    } finally {
      confirmLoading.value = false;
    }
  };
  isConfirmOpen.value = true;
}

function openEditClass(c: Class) {
  editingClassId.value = c.id;
  editClassName.value = c.name;
  editClassGrade.value = c.gradeLevel || '';
  editClassDesc.value = c.description || '';
  editClassActive.value = c.isActive;
  isEditClassModalOpen.value = true;
}

async function handleUpdateClass() {
  if (!editClassName.value.trim() || !editingClassId.value) return;
  savingEditClass.value = true;
  try {
    await api.patch(`/classes/${editingClassId.value}`, {
      name: editClassName.value.trim(),
      gradeLevel: editClassGrade.value.trim() || undefined,
      description: editClassDesc.value.trim() || undefined,
      isActive: editClassActive.value,
    });
    isEditClassModalOpen.value = false;
    await loadData();
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در ویرایش کلاس';
  } finally {
    savingEditClass.value = false;
  }
}

function askDeleteClass(c: Class) {
  confirmTitle.value = 'حذف کلاس';
  confirmMessage.value = `آیا از حذف کلاس "${c.name}" اطمینان دارید؟ با حذف کلاس، دانش‌آموزان این کلاس بدون کلاس خواهند شد و انتسابات تدریس مربوطه حذف می‌شوند.`;
  confirmAction.value = async () => {
    confirmLoading.value = true;
    try {
      await api.delete(`/classes/${c.id}`);
      isConfirmOpen.value = false;
      await loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در حذف کلاس');
    } finally {
      confirmLoading.value = false;
    }
  };
  isConfirmOpen.value = true;
}

function openEditSubject(s: Subject) {
  editingSubjectId.value = s.id;
  editSubjectName.value = s.name;
  editSubjectDesc.value = s.description || '';
  isEditSubjectModalOpen.value = true;
}

async function handleUpdateSubject() {
  if (!editSubjectName.value.trim() || !editingSubjectId.value) return;
  savingEditSubject.value = true;
  try {
    await api.patch(`/subjects/${editingSubjectId.value}`, {
      name: editSubjectName.value.trim(),
      description: editSubjectDesc.value.trim() || undefined,
    });
    isEditSubjectModalOpen.value = false;
    await loadData();
  } catch (err: any) {
    errorMessage.value = err.message || 'خطا در ویرایش درس';
  } finally {
    savingEditSubject.value = false;
  }
}

function askDeleteSubject(s: Subject) {
  confirmTitle.value = 'حذف درس';
  confirmMessage.value = `آیا از حذف درس "${s.name}" اطمینان دارید؟ انتسابات تدریس معلمان برای این درس نیز حذف خواهند شد.`;
  confirmAction.value = async () => {
    confirmLoading.value = true;
    try {
      await api.delete(`/subjects/${s.id}`);
      isConfirmOpen.value = false;
      await loadData();
    } catch (e: any) {
      alert(e.message || 'خطا در حذف درس');
    } finally {
      confirmLoading.value = false;
    }
  };
  isConfirmOpen.value = true;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">ساختار آموزشی مدرسه</h1>
        <p class="text-xs text-slate-500 mt-0.5">مدیریت کلاس‌ها، دروس، انتساب تدریس معلمان و تخصیص دانش‌آموزان</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="activeTab === 'classes'"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="isClassModalOpen = true"
        >
          <Plus class="w-4 h-4" />
          <span>کلاس جدید</span>
        </button>

        <button
          v-if="activeTab === 'classes'"
          class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="isStudentAssignModalOpen = true"
        >
          <Users class="w-4 h-4" />
          <span>انتساب دانش‌آموز به کلاس</span>
        </button>

        <button
          v-if="activeTab === 'subjects'"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="isSubjectModalOpen = true"
        >
          <Plus class="w-4 h-4" />
          <span>درس جدید</span>
        </button>

        <button
          v-if="activeTab === 'assignments'"
          class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          @click="isAssignModalOpen = true"
        >
          <Plus class="w-4 h-4" />
          <span>انتساب تدریس جدید</span>
        </button>
      </div>
    </div>

    <!-- Alert Notifications -->
    <div
      v-if="errorMessage"
      class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2"
    >
      <AlertCircle class="w-4 h-4 text-rose-600" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Tab navigation -->
    <div class="p-1 bg-white border border-slate-200 rounded-2xl flex max-w-lg">
      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          activeTab === 'classes' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800',
        ]"
        @click="activeTab = 'classes'"
      >
        کلاس‌ها ({{ toPersianDigits(classes.length) }})
      </button>

      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          activeTab === 'subjects' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800',
        ]"
        @click="activeTab = 'subjects'"
      >
        دروس ({{ toPersianDigits(subjects.length) }})
      </button>

      <button
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
          activeTab === 'assignments' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800',
        ]"
        @click="activeTab = 'assignments'"
      >
        انتسابات تدریس ({{ toPersianDigits(assignments.length) }})
      </button>
    </div>

    <!-- Tab 1: Classes Table -->
    <div v-if="activeTab === 'classes'" class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">نام کلاس</th>
              <th class="p-3.5">پایه تحصیلی</th>
              <th class="p-3.5">توضیحات</th>
              <th class="p-3.5">وضعیت</th>
              <th class="p-3.5 pl-5 text-left">عملیات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-for="c in classes" :key="c.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="p-3.5 pr-5 font-bold text-slate-800">{{ c.name }}</td>
              <td class="p-3.5 text-slate-600">{{ c.gradeLevel || '—' }}</td>
              <td class="p-3.5 text-slate-500">{{ c.description || '—' }}</td>
              <td class="p-3.5">
                <span
                  :class="[
                    'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                    c.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200',
                  ]"
                >
                  {{ c.isActive ? 'فعال' : 'غیرفعال' }}
                </span>
              </td>
              <td class="p-3.5 pl-5 text-left flex items-center justify-end gap-2">
                <button
                  class="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                  @click="openEditClass(c)"
                >
                  <Pencil class="w-3.5 h-3.5" />
                  <span>ویرایش</span>
                </button>
                <button
                  class="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1"
                  @click="askDeleteClass(c)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 2: Subjects Table -->
    <div v-if="activeTab === 'subjects'" class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">نام درس</th>
              <th class="p-3.5">توضیحات برنامه درسی</th>
              <th class="p-3.5 pl-5 text-left">عملیات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-for="s in subjects" :key="s.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="p-3.5 pr-5 font-bold text-slate-800">{{ s.name }}</td>
              <td class="p-3.5 text-slate-500">{{ s.description || '—' }}</td>
              <td class="p-3.5 pl-5 text-left flex items-center justify-end gap-2">
                <button
                  class="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                  @click="openEditSubject(s)"
                >
                  <Pencil class="w-3.5 h-3.5" />
                  <span>ویرایش</span>
                </button>
                <button
                  class="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1"
                  @click="askDeleteSubject(s)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab 3: Assignments Table -->
    <div v-if="activeTab === 'assignments'" class="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-xs">
          <thead class="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th class="p-3.5 pr-5">معلم</th>
              <th class="p-3.5">کلاس</th>
              <th class="p-3.5">درس</th>
              <th class="p-3.5 pl-5 text-left">عملیات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-for="a in assignments" :key="a.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="p-3.5 pr-5 font-bold text-slate-800">
                {{ a.teacher?.firstName }} {{ a.teacher?.lastName }}
              </td>
              <td class="p-3.5 text-slate-600">{{ a.class?.name }}</td>
              <td class="p-3.5 text-slate-600 font-bold">{{ a.subject?.name }}</td>
              <td class="p-3.5 pl-5 text-left flex items-center justify-end gap-2">
                <button
                  class="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  @click="askDeleteAssignment(a.id)"
                >
                  حذف انتساب
                </button>
                <button
                  class="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors"
                  @click="askDepartTeacher(a.teacherId, `${a.teacher?.firstName} ${a.teacher?.lastName}`)"
                >
                  ثبت خروج معلم
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Create Class -->
    <AdminModal :is-open="isClassModalOpen" title="ایجاد کلاس جدید" @close="isClassModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">نام کلاس:</label>
          <input
            v-model="className"
            type="text"
            placeholder="مثال: کلاس هفتم الف"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">پایه تحصیلی:</label>
          <input
            v-model="classGrade"
            type="text"
            placeholder="مثال: پایه هفتم"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">توضیحات (اختیاری):</label>
          <textarea
            v-model="classDesc"
            rows="2"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isClassModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="savingClass || !className.trim()"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          @click="handleCreateClass"
        >
          ایجاد کلاس
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Edit Class -->
    <AdminModal :is-open="isEditClassModalOpen" title="ویرایش کلاس" @close="isEditClassModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">نام کلاس:</label>
          <input
            v-model="editClassName"
            type="text"
            placeholder="مثال: پایه هفتم الف"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">پایه تحصیلی (اختیاری):</label>
          <input
            v-model="editClassGrade"
            type="text"
            placeholder="مثال: پایه هفتم"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">توضیحات (اختیاری):</label>
          <textarea
            v-model="editClassDesc"
            rows="2"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          ></textarea>
        </div>
        <div class="flex items-center gap-2 pt-1">
          <input
            id="editClassActive"
            v-model="editClassActive"
            type="checkbox"
            class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
          />
          <label for="editClassActive" class="text-xs font-bold text-slate-700 select-none cursor-pointer">
            کلاس فعال است
          </label>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isEditClassModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="savingEditClass || !editClassName.trim()"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          @click="handleUpdateClass"
        >
          ذخیره تغییرات
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Create Subject -->
    <AdminModal :is-open="isSubjectModalOpen" title="ایجاد درس جدید" @close="isSubjectModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">نام درس:</label>
          <input
            v-model="subjectName"
            type="text"
            placeholder="مثال: ریاضیات، علوم تجربی..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">توضیحات (اختیاری):</label>
          <textarea
            v-model="subjectDesc"
            rows="2"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isSubjectModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="savingSubject || !subjectName.trim()"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          @click="handleCreateSubject"
        >
          ایجاد درس
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Edit Subject -->
    <AdminModal :is-open="isEditSubjectModalOpen" title="ویرایش درس" @close="isEditSubjectModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">نام درس:</label>
          <input
            v-model="editSubjectName"
            type="text"
            placeholder="مثال: ریاضیات، علوم تجربی..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">توضیحات (اختیاری):</label>
          <textarea
            v-model="editSubjectDesc"
            rows="2"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isEditSubjectModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="savingEditSubject || !editSubjectName.trim()"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          @click="handleUpdateSubject"
        >
          ذخیره تغییرات
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Create Assignment -->
    <AdminModal :is-open="isAssignModalOpen" title="انتساب تدریس معلم" @close="isAssignModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">معلم:</label>
          <select v-model="assignTeacherId" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800">
            <option value="" disabled>انتخاب معلم...</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">
              {{ t.firstName }} {{ t.lastName }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">کلاس:</label>
          <select v-model="assignClassId" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800">
            <option value="" disabled>انتخاب کلاس...</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">درس:</label>
          <select v-model="assignSubjectId" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800">
            <option value="" disabled>انتخاب درس...</option>
            <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isAssignModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="savingAssign || !assignTeacherId || !assignClassId || !assignSubjectId"
          class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          @click="handleCreateAssignment"
        >
          ثبت انتساب تدریس
        </button>
      </template>
    </AdminModal>

    <!-- Modal: Assign Student to Class -->
    <AdminModal :is-open="isStudentAssignModalOpen" title="انتساب دانش‌آموز به کلاس" @close="isStudentAssignModalOpen = false">
      <div class="space-y-3.5">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">دانش‌آموز:</label>
          <select v-model="targetStudentId" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800">
            <option value="" disabled>انتخاب دانش‌آموز...</option>
            <option v-for="st in students" :key="st.id" :value="st.id">
              {{ st.firstName }} {{ st.lastName }} (کد ملی: {{ toPersianDigits(st.nationalId) }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">کلاس مقصد:</label>
          <select v-model="targetClassId" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800">
            <option value="" disabled>انتخاب کلاس...</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200" @click="isStudentAssignModalOpen = false">
          انصراف
        </button>
        <button
          :disabled="savingStudentAssign || !targetStudentId || !targetClassId"
          class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
          @click="handleAssignStudentToClass"
        >
          تخصیص به کلاس
        </button>
      </template>
    </AdminModal>

    <!-- Confirmation Dialog -->
    <ConfirmDialog
      :is-open="isConfirmOpen"
      :title="confirmTitle"
      :message="confirmMessage"
      :loading="confirmLoading"
      is-destructive
      @confirm="confirmAction"
      @cancel="isConfirmOpen = false"
    />
  </div>
</template>
