import { createApp } from '../../src/app';

/** Shared Express app instance for supertest — never actually binds a port. */
export const app = createApp();
