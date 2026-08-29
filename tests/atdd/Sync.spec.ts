import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server';

describe('ATDD: SQLite Multi-Store Sync Contracts (Step 1)', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  beforeEach(async () => {
    // Register User A
    const userAEmail = `synca_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@paios.ai`;
    const regResA = await request(app)
      .post('/api/auth/register')
      .send({
        email: userAEmail,
        password: 'PasswordUserA123!',
        displayName: 'Sync User A',
      });
    userAToken = regResA.body.token;
    userAId = regResA.body.user?.id;

    // Register User B for multi-tenant isolation verification
    const userBEmail = `syncb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@paios.ai`;
    const regResB = await request(app)
      .post('/api/auth/register')
      .send({
        email: userBEmail,
        password: 'PasswordUserB123!',
        displayName: 'Sync User B',
      });
    userBToken = regResB.body.token;
    userBId = regResB.body.user?.id;
  });

  describe('POST /api/sync/push', () => {
    it('requires Bearer JWT authorization (401 Unauthorized)', async () => {
      const response = await request(app)
        .post('/api/sync/push')
        .send({
          key: 'paios_tasks_v1',
          payload: [{ id: '1', title: 'Test Task' }],
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('validates presence of key and payload (400 Bad Request)', async () => {
      // Missing key
      const resMissingKey = await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          payload: { foo: 'bar' },
        });
      expect(resMissingKey.status).toBe(400);
      expect(resMissingKey.body.error).toMatch(/key.*required/i);

      // Missing payload
      const resMissingPayload = await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          key: 'paios_tasks_v1',
        });
      expect(resMissingPayload.status).toBe(400);
      expect(resMissingPayload.body.error).toMatch(/payload.*required/i);
    });

    it('upserts record with composite key (${userId}:${storageKey}) and returns success', async () => {
      const storageKey = 'paios_tasks_v1';
      const initialPayload = [
        { id: 't1', title: 'Task 1', completed: false },
      ];

      const pushRes = await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          key: storageKey,
          payload: initialPayload,
        });

      expect(pushRes.status).toBe(200);
      expect(pushRes.body).toMatchObject({
        success: true,
        key: storageKey,
      });
      expect(pushRes.body).toHaveProperty('updatedAt');

      // Subsequent update to same key
      const updatedPayload = [
        { id: 't1', title: 'Task 1', completed: true },
        { id: 't2', title: 'Task 2', completed: false },
      ];

      const updateRes = await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          key: storageKey,
          payload: updatedPayload,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      // Verify pull returns updated payload
      const pullRes = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(pullRes.status).toBe(200);
      expect(pullRes.body.data[storageKey]).toEqual(updatedPayload);
    });
  });

  describe('GET /api/sync/pull', () => {
    it('requires Bearer JWT authorization (401 Unauthorized)', async () => {
      const response = await request(app).get('/api/sync/pull');
      expect(response.status).toBe(401);
    });

    it('returns dictionary of all storage records matching authenticated user ID with complete data isolation', async () => {
      // User A pushes tasks and settings
      await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          key: 'paios_tasks_v1',
          payload: [{ id: 'user_a_task_1', title: 'Task A' }],
        });

      await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          key: 'paios_settings_v1',
          payload: { theme: 'dark', soundEnabled: true },
        });

      // User B pushes different dataset
      await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          key: 'paios_tasks_v1',
          payload: [{ id: 'user_b_task_1', title: 'User B Task' }],
        });

      // User A pulls: must only contain User A's data
      const pullARes = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(pullARes.status).toBe(200);
      expect(pullARes.body).toHaveProperty('data');
      expect(pullARes.body.data['paios_tasks_v1']).toEqual([{ id: 'user_a_task_1', title: 'Task A' }]);
      expect(pullARes.body.data['paios_settings_v1']).toEqual({ theme: 'dark', soundEnabled: true });

      // User B pulls: must only contain User B's data
      const pullBRes = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(pullBRes.status).toBe(200);
      expect(pullBRes.body.data['paios_tasks_v1']).toEqual([{ id: 'user_b_task_1', title: 'User B Task' }]);
      expect(pullBRes.body.data['paios_settings_v1']).toBeUndefined();
    });
  });

  describe('DELETE /api/sync/data', () => {
    beforeEach(async () => {
      // Seed stores for User A
      await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ key: 'paios_tasks_v1', payload: [{ id: 'task1' }] });

      await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ key: 'paios_journal_v1', payload: [{ id: 'j1' }] });

      // Seed store for User B
      await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ key: 'paios_tasks_v1', payload: [{ id: 'b_task1' }] });
    });

    it('requires Bearer JWT authorization (401 Unauthorized)', async () => {
      const res = await request(app).delete('/api/sync/data');
      expect(res.status).toBe(401);
    });

    it('deletes an individual store key when specified in query or body', async () => {
      const deleteRes = await request(app)
        .delete('/api/sync/data?key=paios_tasks_v1')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify User A tasks removed but journal retained
      const pullRes = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(pullRes.body.data['paios_tasks_v1']).toBeUndefined();
      expect(pullRes.body.data['paios_journal_v1']).toBeDefined();

      // Verify User B tasks untouched
      const pullBRes = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${userBToken}`);
      expect(pullBRes.body.data['paios_tasks_v1']).toBeDefined();
    });

    it('drops all scoped data for authenticated user when called without key parameter', async () => {
      const deleteAllRes = await request(app)
        .delete('/api/sync/data')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(deleteAllRes.status).toBe(200);
      expect(deleteAllRes.body.success).toBe(true);

      // Verify User A has empty data dictionary
      const pullARes = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(pullARes.body.data).toEqual({});

      // Verify User B data was not deleted
      const pullBRes = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(pullBRes.body.data['paios_tasks_v1']).toBeDefined();
    });
  });
});
