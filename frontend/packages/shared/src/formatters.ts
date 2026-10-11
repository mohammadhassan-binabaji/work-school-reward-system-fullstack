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
