// Global test setup for Vitest
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'paios-test-secret-jwt-key-2026';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-server-key-xyz';
process.env.SQLITE_DB_PATH = ':memory:';

// Ensure localStorage is cleared in jsdom environment before each test
beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});
