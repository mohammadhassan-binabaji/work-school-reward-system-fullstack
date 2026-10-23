import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface AuthContext {
  user: any;
  cookie: string;
  sessionId: string;
  headers: Record<string, string>;
}

export async function loginUser(
  app: INestApplication,
  nationalId: string,
  password: string,
): Promise<AuthContext> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ nationalId, password })
    .expect(200);

  const sessionId = res.body.sessionId;
  const cookie = res.headers['set-cookie']
    ? res.headers['set-cookie'][0]
    : `sessionId=${sessionId}`;

  return {
    user: res.body.user,
    cookie,
    sessionId,
    headers: {
      Cookie: cookie,
      Authorization: `Bearer ${sessionId}`,
      'x-session-id': sessionId,
    },
  };
}

export async function createInitialAdmin(
  app: INestApplication,
  data?: {
    nationalId?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    password?: string;
  },
): Promise<AuthContext> {
  const adminData = {
    nationalId: data?.nationalId || '1111111111',
    firstName: data?.firstName || 'Admin',
    lastName: data?.lastName || 'Super',
    username: data?.username || `admin_${Date.now()}`,
    password: data?.password || 'AdminPassword123!',
  };

  const res = await request(app.getHttpServer()).post('/api/v1/auth/initial-admin').send(adminData);

  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`Failed to create initial admin: ${JSON.stringify(res.body)}`);
  }

  return loginUser(app, adminData.nationalId, adminData.password);
}

export async function createUser(
  app: INestApplication,
  adminCookie: string,
  data: {
    nationalId: string;
    firstName: string;
    lastName: string;
    username: string;
    password?: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    classId?: string;
  },
): Promise<any> {
  const payload = {
    password: 'Password123!',
    ...data,
  };

  const res = await request(app.getHttpServer())
    .post('/api/v1/users')
    .set('Cookie', adminCookie)
    .send(payload);

  if (res.status !== 201) {
    throw new Error(`Failed to create user ${data.username}: ${JSON.stringify(res.body)}`);
  }

  return res.body;
}

export async function createAndLoginUser(
  app: INestApplication,
  adminCookie: string,
  data: {
    nationalId: string;
    firstName: string;
    lastName: string;
    username: string;
    password?: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    classId?: string;
  },
): Promise<AuthContext> {
  const password = data.password || 'Password123!';
  const user = await createUser(app, adminCookie, { ...data, password });
  const auth = await loginUser(app, data.nationalId, password);
  return { ...auth, user };
}
