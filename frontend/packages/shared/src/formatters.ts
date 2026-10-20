import type { PointAuditLog, ActionType } from './types';

const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '';
  return String(n).replace(/[0-9]/g, (w) => persianDigits[+w]);
}

export function formatNovin(amount: number | null | undefined, options?: { showSign?: boolean; suffix?: boolean }): string {
  if (amount === null || amount === undefined) return '۰ نوین';
  const val = Math.abs(amount);
  const formatted = toPersianDigits(val.toLocaleString('en-US'));
  const sign = options?.showSign ? (amount > 0 ? '+ ' : amount < 0 ? '− ' : '') : (amount < 0 ? '− ' : '');
  const suffix = options?.suffix !== false ? ' نوین' : '';
  return `${sign}${formatted}${suffix}`;
}

export function formatJalaliDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    return '—';
  }
}

export function formatJalaliDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const dateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const timeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateFormatter.format(d)} ساعت ${timeFormatter.format(d)}`;
  } catch {
    return '—';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${toPersianDigits((bytes / 1024).toFixed(1))} کیلوبایت`;
  return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

export function getStatusColor(status: string): { bg: string; text: string; border: string; glow: string } {
  switch (status) {
    case 'COMPLETED':
    case 'ACCEPTED':
    case 'ACTIVE':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/40',
        glow: 'shadow-[0_0_12px_rgba(52,211,153,0.35)]',
      };
    case 'PENDING':
    case 'PENDING_TO_APPROVE':
    case 'PENDING_TO_RECEIVE':
    case 'READY_TO_DO':
      return {
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        border: 'border-cyan-500/40',
        glow: 'shadow-[0_0_12px_rgba(6,182,212,0.35)]',
      };
    case 'DECLINED':
    case 'REJECTED':
    case 'DEACTIVATED':
    case 'DEPARTED':
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/40',
        glow: 'shadow-[0_0_12px_rgba(244,63,94,0.35)]',
      };
    case 'CANCELED':
    case 'INACTIVE':
    case 'REMOVED':
    default:
      return {
        bg: 'bg-slate-500/10',
        text: 'text-slate-400',
        border: 'border-slate-500/40',
        glow: 'shadow-none',
      };
  }
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_TO_APPROVE: 'در انتظار تایید',
    PENDING_TO_RECEIVE: 'در انتظار تحویل',
    COMPLETED: 'تکمیل شده',
    DECLINED: 'رد شده',
    READY_TO_DO: 'آماده اجرا',
    CANCELED: 'لغو شده',
    PENDING: 'در حال بررسی',
    ACCEPTED: 'تایید شده',
    REJECTED: 'رد شده',
    ACTIVE: 'فعال',
    INACTIVE: 'غیرفعال',
    DEACTIVATED: 'غیرفعال شده',
    DEPARTED: 'ترک تحصیل/خدمت',
    ADMIN: 'مدیر سیستم',
    TEACHER: 'معلم',
    STUDENT: 'دانش‌آموز',
  };
  return map[status] || status;
}

export function formatActionType(action: ActionType | string): string {
  const map: Record<string, string> = {
    POOL_FUND_TEACHER: 'تخصیص بودجه معلم',
    TEACHER_AWARD_STUDENT: 'اهدای پاداش به دانش‌آموز',
    ADMIN_ADJUST_STUDENT: 'تنظیم مستقیم مدیر',
    CHALLENGE_AWARD_STUDENT: 'پاداش تایید چالش',
    PROPOSAL_AWARD_STUDENT: 'پاداش تکمیل پیشنهاد',
    REWARD_RESERVE_POINTS: 'رزرو نوین برای جایزه',
    REWARD_DECLINE_RETURN: 'بازگشت نوین (رد جایزه)',
    REWARD_REMOVE_RETURN: 'بازگشت نوین (حذف جایزه)',
    REWARD_RECEIVE_COMPLETE: 'تحویل فیزیکی جایزه',
    STUDENT_DEPARTURE_DEDUCT: 'کسر خروج دانش‌آموز',
  };
  return map[action] || action;
}

export function formatAuditEntity(type: string | null | undefined): string {
  if (!type) return '—';
  const map: Record<string, string> = {
    SYSTEM_POOL: 'استخر نوین',
    TEACHER: 'معلم',
    STUDENT_CURRENT: 'موجودی جاری دانش‌آموز',
    STUDENT_RESERVED: 'نوین رزرو شده دانش‌آموز',
    NONE: '—',
  };
  return map[type] || type;
}

export function formatAuditLogDescription(log: PointAuditLog): string {
  switch (log.actionType) {
    case 'TEACHER_AWARD_STUDENT':
      return log.reasonDetail ? `پاداش معلم: ${log.reasonDetail}` : 'اهدای پاداش معلم برای فعالیت کلاسی';
    case 'ADMIN_ADJUST_STUDENT':
      return log.reasonDetail ? `تنظیم مدیر: ${log.reasonDetail}` : 'تنظیم مستقیم موجودی توسط مدیر';
    case 'CHALLENGE_AWARD_STUDENT':
      return 'پاداش تایید چالش';
    case 'PROPOSAL_AWARD_STUDENT':
      return 'پاداش تایید و تکمیل پیشنهاد';
    case 'REWARD_RESERVE_POINTS':
      return 'رزرو نوین جهت ثبت درخواست جایزه';
    case 'REWARD_DECLINE_RETURN':
      return 'بازگشت نوین به علت رد درخواست جایزه';
    case 'REWARD_REMOVE_RETURN':
      return 'بازگشت نوین به علت حذف جایزه از سامانه';
    case 'REWARD_RECEIVE_COMPLETE':
      return 'تکمیل تحویل فیزیکی جایزه';
    case 'POOL_FUND_TEACHER':
      return 'تخصیص بودجه پاداش معلم از استخر';
    case 'STUDENT_DEPARTURE_DEDUCT':
      return 'تسویه موجودی به علت خروج دانش‌آموز';
    default:
      return log.reasonDetail || 'تغییر موجودی نوین';
  }
}

export function resolveStudentPointDelta(log: PointAuditLog, studentId?: string): number {
  const isTargetStudent = !studentId || log.recipientId === studentId || log.sourceId === studentId;
  if (!isTargetStudent) return 0;

  if (log.actionType === 'REWARD_RECEIVE_COMPLETE') {
    return 0;
  }

  if (log.sourceType === 'STUDENT_CURRENT') {
    return -log.amount;
  }

  if (log.recipientType === 'STUDENT_CURRENT') {
    return log.amount;
  }

  // Fallback by action classification
  switch (log.actionType) {
    case 'REWARD_RESERVE_POINTS':
    case 'STUDENT_DEPARTURE_DEDUCT':
      return -log.amount;
    case 'TEACHER_AWARD_STUDENT':
    case 'CHALLENGE_AWARD_STUDENT':
    case 'PROPOSAL_AWARD_STUDENT':
    case 'REWARD_DECLINE_RETURN':
    case 'REWARD_REMOVE_RETURN':
      return log.amount;
    default:
      return log.amount;
  }
}

export function resolveTeacherPointDelta(log: PointAuditLog, teacherId?: string): number {
  const isTargetTeacher = !teacherId || log.recipientId === teacherId || log.sourceId === teacherId;
  if (!isTargetTeacher) return 0;

  if (log.sourceType === 'TEACHER') {
    return -log.amount;
  }

  if (log.recipientType === 'TEACHER') {
    return log.amount;
  }

  if (log.actionType === 'TEACHER_AWARD_STUDENT') {
    return -log.amount;
  }

  if (log.actionType === 'POOL_FUND_TEACHER') {
    return log.amount;
  }

  return 0;
}
