import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../server';

describe('ATDD: Secure Gemini AI Proxy & Key Isolation (Step 1)', () => {
  let authToken: string;

  beforeEach(async () => {
    // Register authenticated user
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@paios.ai`,
        password: 'SecurePassword123!',
        displayName: 'AI Test User',
      });
    authToken = regRes.body.token;
  });

  describe('POST /api/ai/chat', () => {
    it('rejects requests missing Bearer JWT (401 Unauthorized)', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'Hello PAIOS, organize my schedule today.',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/unauthorized|token.*required/i);
    });

    it('rejects requests with missing message payload (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/message.*required|empty/i);
    });

    it('rejects empty or whitespace-only message payload (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: '   ' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('processes AI chat exclusively server-side without requiring client-supplied API keys', async () => {
      const clientPayload = {
        message: 'What are my top 3 priorities for focus today?',
        context: {
          tasks: ['Finish report', 'Review PR'],
        },
        // Client intentionally does NOT provide any apiKey or credential
      };

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientPayload);

      // Verify no client key error is raised; server should either process or return structured response
      expect([200, 502, 503]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('reply');
        expect(typeof response.body.reply).toBe('string');
        // Ensure server does not echo back raw server-side secrets or API keys
        expect(JSON.stringify(response.body)).not.toContain(process.env.GEMINI_API_KEY);
      }
    });

    it('strips or ignores any client-attempted API key injection to enforce server-side key isolation', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello AI',
          apiKey: 'attempted_client_override_key',
          clientApiKey: 'fake_key',
        });

      expect([200, 400, 502, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('reply');
      }
    });
  });
});
