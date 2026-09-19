import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildApp } from '../../src/app.js';
import { closeRedis } from '../../src/core/redis.js';

describe('OpenAPI 3.0 Contract Adherence Tests (T062)', () => {
  let app: FastifyInstance;
  let openapiContent: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Read openapi.yaml
    const openapiPath = resolve(process.cwd(), '../specs/001-student-reward-backend/contracts/openapi.yaml');
    openapiContent = readFileSync(openapiPath, 'utf-8');
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
  });

  it('validates all OpenAPI paths and HTTP methods are registered in Fastify router', async () => {
    const lines = openapiContent.split('\n');
    let currentPath = '';
    const contractEndpoints: Array<{ path: string; method: string }> = [];

    for (const line of lines) {
      const pathMatch = line.match(/^ {2}(\/[a-zA-Z0-9_\-\/{}:]+):\s*$/);
      if (pathMatch) {
        currentPath = pathMatch[1];
        continue;
      }

      const methodMatch = line.match(/^ {4}(get|post|put|delete|patch):\s*$/i);
      if (methodMatch && currentPath) {
        contractEndpoints.push({
          path: `/api/v1${currentPath}`,
          method: methodMatch[1].toUpperCase()
        });
      }
    }

    expect(contractEndpoints.length).toBeGreaterThanOrEqual(30);

    const dummyUuid = '00000000-0000-0000-0000-000000000000';

    for (const endpoint of contractEndpoints) {
      // Substitute path variables like {id}, {studentId}, {activityId} with valid dummy UUID
      const testUrl = endpoint.path.replace(/\{[a-zA-Z0-9_]+\}/g, dummyUuid);

      const res = await app.inject({
        method: endpoint.method as any,
        url: testUrl
      });

      // If the route was not found in Fastify router, the notFoundHandler returns 404 with code: 'NOT_FOUND'
      const isRouteNotFound =
        res.statusCode === 404 &&
        res.headers['content-type']?.includes('application/json') &&
        JSON.parse(res.payload).code === 'NOT_FOUND';

      expect(
        isRouteNotFound,
        `Expected endpoint ${endpoint.method} ${endpoint.path} (tested as ${testUrl}) to be registered in Fastify router, but got 404 NOT_FOUND`
      ).toBe(false);
    }
  });

  it('serves valid Swagger / OpenAPI JSON at /documentation/json', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/documentation/json'
    });

    expect(res.statusCode).toBe(200);
    const doc = JSON.parse(res.payload);
    expect(doc.openapi || doc.swagger).toBeDefined();
  });
});
