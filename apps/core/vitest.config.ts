import { defineConfig } from 'vitest/config';

// Force test-mode env BEFORE main.ts is loaded — main.ts hard-exits when
// NODE_ENV=production and JWT_SECRET is unset.
process.env.NODE_ENV = process.env.NODE_ENV === 'production' ? 'test' : (process.env.NODE_ENV || 'test');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'vitest-fixed-secret';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: ['src/**/__tests__/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: process.env.JWT_SECRET,
    },
    // No coverage threshold yet — baseline run only.
    // pool defaults to 'forks' which is fine for our supertest integration tests.
  },
});
