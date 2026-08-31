import request from 'supertest';
import type { TestUser } from '../factories';
import { app } from './testApp';

/** Logs in a factory-created user through the real HTTP endpoint and returns its bearer token. */
export async function loginAs(user: TestUser): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: user.password });
  if (res.status !== 200) {
    throw new Error(`loginAs(${user.email}) failed with status ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.accessToken as string;
}
