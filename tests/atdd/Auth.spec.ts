import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server';

describe('ATDD: User Authentication API Contract (Step 1)', () => {
  const testUser = {
    email: `test_${Date.now()}@paios.ai`,
    password: 'SecurePassword123!',
    displayName: 'PAIOS Tester',
  };

  describe('POST /api/auth/register', () => {
    it('rejects registration with missing email (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'ValidPassword123!',
          displayName: 'No Email User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/email.*required/i);
    });

    it('rejects registration with missing password (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nopassword@paios.ai',
          displayName: 'No Password User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/password.*required/i);
    });

    it('rejects passwords shorter than 8 characters (400 Bad Request)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'shortpass@paios.ai',
          password: 'pass',
          displayName: 'Short Password User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/8 characters/i);
    });

    it('creates a new user, returns 201/200, JWT token, and user profile', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.split('.')).toHaveLength(3); // JWT structure check

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        email: testUser.email.toLowerCase(),
        displayName: testUser.displayName,
      });
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('password'); // Password hash must never leak
    });

    it('prevents duplicate email registrations (409 Conflict)', async () => {
      const duplicateUser = {
        email: `dup_${Date.now()}@paios.ai`,
        password: 'Password123!',
        displayName: 'Original User',
      };

      // Initial registration
      const firstRes = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser);
      expect([200, 201]).toContain(firstRes.status);

      // Attempt second registration with same email
      const secondRes = await request(app)
        .post('/api/auth/register')
        .send({
          ...duplicateUser,
          displayName: 'Duplicate Attempter',
        });

      expect(secondRes.status).toBe(409);
      expect(secondRes.body).toHaveProperty('error');
      expect(secondRes.body.error).toMatch(/already registered|exists|duplicate/i);
    });
  });

  describe('POST /api/auth/login', () => {
    const loginUser = {
      email: `login_test_${Date.now()}@paios.ai`,
      password: 'CorrectPassword123!',
      displayName: 'Login Test User',
    };

    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(loginUser);
    });

    it('rejects non-existent email (401 Unauthorized)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent_user_999@paios.ai',
          password: 'SomePassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid.*credentials|not found|unauthorized/i);
    });

    it('rejects invalid password for existing email (401 Unauthorized)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUser.email,
          password: 'WrongPassword456!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid.*credentials|incorrect|unauthorized/i);
    });

    it('returns a valid JWT token and user profile on matching credentials (200 OK)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUser.email,
          password: loginUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.split('.')).toHaveLength(3);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginUser.email.toLowerCase());
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).not.toHaveProperty('password');
    });
  });

  describe('GET /api/auth/me', () => {
    let validToken: string;
    const meUser = {
      email: `me_${Date.now()}@paios.ai`,
      password: 'ValidPassword123!',
      displayName: 'Session User',
    };

    beforeEach(async () => {
      const regRes = await request(app).post('/api/auth/register').send(meUser);
      validToken = regRes.body.token;
    });

    it('returns authenticated user profile when Bearer token is provided (200 OK)', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(meUser.email.toLowerCase());
      expect(response.body.user.displayName).toBe(meUser.displayName);
      expect(response.body.user).toHaveProperty('id');
    });

    it('rejects with 401 Unauthorized when Bearer token is missing', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/token.*required|unauthorized|missing/i);
    });

    it('rejects with 403 Forbidden when Bearer token is invalid or tampered', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token123');

      expect([401, 403]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/forbidden|invalid.*token|expired/i);
    });
  });
});
