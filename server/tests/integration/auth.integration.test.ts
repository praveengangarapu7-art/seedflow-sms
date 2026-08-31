import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestUser } from '../factories';
import { app } from './testApp';

describe('POST /api/v1/auth/login', () => {
  it('issues an access token for valid credentials', async () => {
    const user = await createTestUser({ role: 'Admin' });

    const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.role).toBe('Admin');
  });

  it('rejects an incorrect password', async () => {
    const user = await createTestUser();
    const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects an unknown email', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('authenticated route access', () => {
  it('rejects a request with no bearer token', async () => {
    const res = await request(app).get('/api/v1/production/seed-lots');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed/garbage bearer token', async () => {
    const res = await request(app).get('/api/v1/production/seed-lots').set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  it('accepts a valid token and returns data', async () => {
    const user = await createTestUser({ role: 'Admin' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: user.password });

    const res = await request(app)
      .get('/api/v1/production/seed-lots')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
