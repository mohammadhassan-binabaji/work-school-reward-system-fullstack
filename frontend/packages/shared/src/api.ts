export interface ApiError {
  statusCode: number;
  message: string;
  errorCode?: string;
  details?: any;
  errors?: any[];
}

export class ApiClient {
  private baseUrl: string;
  private nativeSessionId: string | null = null;
  private csrfToken: string | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '/api/v1';
    // Remove trailing slash if any
    this.baseUrl = this.baseUrl.replace(/\/+$/, '');
  }

  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public getSessionId(): string | null {
    return this.nativeSessionId;
  }

  public setNativeSessionId(id: string): void {
    this.nativeSessionId = id;
    this.csrfToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('session_id');
      sessionStorage.removeItem('session_id');
    }
  }

  public clearSession(): void {
    this.nativeSessionId = null;
    this.csrfToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('session_id');
      sessionStorage.removeItem('session_id');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_info');
    }
  }

  private getHeaders(isFormData = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const sessionId = this.getSessionId();
    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
    }
    return headers;
  }

  private getMutationHeaders(path: string, isFormData = false): HeadersInit {
    const headers = this.getHeaders(isFormData) as Record<string, string>;
    if (
      this.nativeSessionId ||
      path === '/auth/login' ||
      path === '/auth/mobile-login' ||
      path === '/auth/initial-admin'
    ) {
      return headers;
    }

    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }
    return headers;
  }

  private getCredentialsMode(path?: string): RequestCredentials {
    return this.nativeSessionId || path === '/auth/mobile-login' ? 'omit' : 'include';
  }

  public async loadCsrfToken(): Promise<void> {
    const { csrfToken } = await this.get<{ csrfToken: string }>('/auth/csrf');
    this.csrfToken = csrfToken;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (res.status === 204) {
      return {} as T;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        let msg = data.message || 'خطایی در پردازش درخواست رخ داد';
        if (Array.isArray(msg)) {
          msg = msg.join(' ، ');
        }
        const error: ApiError = {
          statusCode: res.status,
          message: this.translateErrorMessage(msg, data.errorCode, res.status),
          errorCode: data.errorCode,
          details: data.details,
          errors: data.errors || data.details,
        };
        throw error;
      }
      return data as T;
    }

    if (!res.ok) {
      const text = await res.text();
      throw {
        statusCode: res.status,
        message: this.translateErrorMessage(text, undefined, res.status),
      } as ApiError;
    }

    return (await res.blob()) as unknown as T;
  }

  private translateErrorMessage(msg: string, code?: string, status?: number): string {
    if (code === 'LOGIN_ROLE_MISMATCH') {
      return 'این حساب کاربری به این پنل دسترسی ندارد.';
    }
    if (code === 'CSRF_INVALID' || code === 'ORIGIN_NOT_ALLOWED') {
      return 'اعتبار درخواست تأیید نشد. صفحه را تازه‌سازی کرده و دوباره تلاش کنید.';
    }
    if (code === 'INVALID_CREDENTIALS') {
      return 'کد ملی یا رمز عبور اشتباه است.';
    }
    if (code === 'SESSION_EXPIRED') {
      return 'نشست کاربری شما منقضی شده است. لطفاً دوباره وارد شوید.';
    }
    if (code === 'UNAUTHORIZED_CLASS_ACCESS') {
      return 'شما دسترسی لازم برای انجام این عملیات را ندارید.';
    }
    if (code === 'ACCOUNT_INACTIVE') {
      return 'حساب کاربری شما غیرفعال است.';
    }
    if (code === 'CLASS_NOT_FOUND') {
      return 'کلاس مورد نظر یافت نشد.';
    }
    if (code === 'USER_NOT_FOUND') {
      return 'کاربر یافت نشد.';
    }
    if (code === 'CANNOT_DELETE_SELF') {
      return 'مدیر نمی‌تواند حساب خود را حذف کند.';
    }
    if (code === 'CANNOT_MODIFY_OWN_STATE') {
      return 'مدیر نمی‌تواند وضعیت حساب خود را به حالت غیرفعال تغییر دهد.';
    }
    if (code === 'INSUFFICIENT_POOL_BALANCE') {
      return 'موجودی استخر نوین سیستم کافی نیست.';
    }
    if (code === 'INSUFFICIENT_TEACHER_BALANCE') {
      return 'موجودی نوین شما برای اهدای پاداش کافی نیست.';
    }
    if (code === 'INSUFFICIENT_POINTS') {
      return 'موجودی نوین شما کافی نیست.';
    }
    if (code === 'OUT_OF_STOCK') {
      return 'موجودی این جایزه به پایان رسیده است.';
    }
    if (code === 'STUDENT_BANNED') {
      return 'شما به دلیل رد شدن متوالی در این چالش به طور موقت مسدود شده‌اید.';
    }
    if (code === 'COMPLETION_LIMIT_REACHED') {
      return 'سقف انجام این فعالیت تکمیل شده است.';
    }
    if (code === 'PENDING_REQUEST_EXISTS') {
      return 'شما در حال حاضر یک درخواست فعال در انتظار بررسی برای این جایزه دارید.';
    }

    // Common standard messages
    if (msg.includes('Invalid credentials') || msg.includes('nationalId or password')) {
      return 'کد ملی یا رمز عبور اشتباه است.';
    }
    if (msg.includes('nationalId must be exactly 10 digits')) {
      return 'کد ملی باید دقیقاً ۱۰ رقم باشد.';
    }
    return msg;
  }

  public async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    let url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
      const qs = query.toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: this.getCredentialsMode(path),
    });
    return this.handleResponse<T>(res);
  }

  public async openEventStream(path: string, signal: AbortSignal): Promise<Response> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {};
    const sessionId = this.getSessionId();
    if (sessionId) {
      headers['Authorization'] = `Bearer ${sessionId}`;
    }

    return fetch(url, {
      method: 'GET',
      headers,
      credentials: this.getCredentialsMode(path),
      signal,
    });
  }

  public async post<T>(path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = await this.getMutationHeaders(path);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: this.getCredentialsMode(path),
    });
    return this.handleResponse<T>(res);
  }

  public async patch<T>(path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = await this.getMutationHeaders(path);
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: this.getCredentialsMode(path),
    });
    return this.handleResponse<T>(res);
  }

  public async put<T>(path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = await this.getMutationHeaders(path);
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: this.getCredentialsMode(path),
    });
    return this.handleResponse<T>(res);
  }

  public async delete<T>(path: string, body?: any): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = await this.getMutationHeaders(path);
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: this.getCredentialsMode(path),
    });
    return this.handleResponse<T>(res);
  }

  public async upload<T>(path: string, file: File): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const formData = new FormData();
    formData.append('file', file);

    const headers = await this.getMutationHeaders(path, true);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: this.getCredentialsMode(path),
    });
    return this.handleResponse<T>(res);
  }

  public async uploadFormData<T>(path: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = await this.getMutationHeaders(path, true);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: this.getCredentialsMode(path),
    });
    return this.handleResponse<T>(res);
  }

  public async patchFormData<T>(path: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = await this.getMutationHeaders(path, true);
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: formData,
      credentials: this.getCredentialsMode(path),
    });
    return this.handleResponse<T>(res);
  }

  public async uploadMulti<T>(path: string, files: Record<string, File | null | undefined>): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const formData = new FormData();
    Object.entries(files).forEach(([fieldName, file]) => {
      if (file) {
        formData.append(fieldName, file);
      }
    });

    const headers = await this.getMutationHeaders(path, true);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: this.getCredentialsMode(path),
    });
    return this.handleResponse<T>(res);
  }

  public async downloadFile(path: string, params?: Record<string, any>): Promise<Blob> {
    let url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
      const qs = query.toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: this.getCredentialsMode(path),
    });
    if (!res.ok) {
      throw new Error('دانلود فایل با خطا مواجه شد');
    }
    return res.blob();
  }
}

export const api = new ApiClient();
