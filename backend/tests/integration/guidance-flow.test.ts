import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';
import { cleanDatabase } from '../test-helpers.js';

describe('Point Earning Guidance Cards Integration Tests (US8)', () => {
  let app: FastifyInstance;
  let adminSessionId: string;
  let studentSessionId: string;
  let cardId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    await cleanDatabase();

    // Provision admin
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'admin_guidance',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'Guidance'
      }
    });

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '1000000001', password: 'Password123!' }
    });
    adminSessionId = JSON.parse(adminLogin.payload).sessionId;

    // Create class and tier
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Class Guidance' }
    });
    const classId = JSON.parse(classRes.payload).id;

    // Create student
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000001',
        username: 'student_guidance',
        password: 'Password123!',
        firstName: 'Student',
        lastName: 'Guidance',
        role: 'STUDENT',
        classId
      }
    });

    const sLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000001', password: 'Password123!' }
    });
    studentSessionId = JSON.parse(sLogin.payload).sessionId;
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
    await closeRedis();
  });

  it('allows administrator to create a guidance card', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/guidance/cards',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        title: 'Math Olympiad Prep',
        description: 'Participate in the weekly math olympiad problem set and discussions.',
        logoId: 'trophy_gold',
        suggestedPointsText: '10 to 30 points'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBeDefined();
    expect(body.title).toBe('Math Olympiad Prep');
    expect(body.description).toBe('Participate in the weekly math olympiad problem set and discussions.');
    expect(body.logoId).toBe('trophy_gold');
    expect(body.suggestedPointsText).toBe('10 to 30 points');
    expect(body.status).toBe('Active');
    cardId = body.id;
  });

  it('allows authenticated student to list guidance cards as read-only', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/guidance/cards',
      headers: { authorization: `Bearer ${studentSessionId}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    const card = body.find((c: any) => c.id === cardId);
    expect(card).toBeDefined();
    expect(card.title).toBe('Math Olympiad Prep');
  });

  it('rejects student attempts to create a guidance card (403 Forbidden)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/guidance/cards',
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: {
        title: 'Student Hack',
        description: 'Trying to create my own card',
        logoId: 'star_silver',
        suggestedPointsText: '100 points'
      }
    });

    expect(res.statusCode).toBe(403);
  });

  it('allows administrator to update a guidance card', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/guidance/cards/${cardId}`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        title: 'Advanced Math Olympiad Prep',
        description: 'Participate in the advanced weekly math olympiad problem set.',
        logoId: 'trophy_platinum',
        suggestedPointsText: '20 to 50 points'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.title).toBe('Advanced Math Olympiad Prep');
    expect(body.logoId).toBe('trophy_platinum');
    expect(body.suggestedPointsText).toBe('20 to 50 points');
  });

  it('rejects student attempts to update a guidance card (403 Forbidden)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/guidance/cards/${cardId}`,
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: {
        title: 'Student Update',
        description: 'Trying to update',
        logoId: 'star_silver',
        suggestedPointsText: '1000 points'
      }
    });

    expect(res.statusCode).toBe(403);
  });

  it('rejects student attempts to remove a guidance card (403 Forbidden)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/guidance/cards/${cardId}`,
      headers: { authorization: `Bearer ${studentSessionId}` }
    });

    expect(res.statusCode).toBe(403);
  });

  it('allows administrator to remove a guidance card (204 No Content)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/guidance/cards/${cardId}`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });

    expect(res.statusCode).toBe(204);

    // Verify it is no longer listed in active cards
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/guidance/cards',
      headers: { authorization: `Bearer ${studentSessionId}` }
    });
    expect(listRes.statusCode).toBe(200);
    const body = JSON.parse(listRes.payload);
    const found = body.find((c: any) => c.id === cardId);
    expect(found).toBeUndefined();
  });

  it('returns 404 when updating or deleting a non-existent card', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/guidance/cards/${nonExistentId}`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        title: 'Ghost Card',
        description: 'Does not exist',
        logoId: 'ghost',
        suggestedPointsText: '0 points'
      }
    });
    expect(putRes.statusCode).toBe(404);

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/guidance/cards/${nonExistentId}`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(delRes.statusCode).toBe(404);
  });
});
