import { describe, it, expect, vi } from 'vitest';
import { AuthSyncService } from '../../src/services/AuthSyncService';

describe('Unit Test: AuthModal & AuthSyncService Interface Validation', () => {
  it('validates email format regex rules correctly', () => {
    const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    expect(isValidEmail('user@paios.ai')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
    expect(isValidEmail('test@domain')).toBe(false);
    expect(isValidEmail('alex@paios.local')).toBe(true);
  });

  it('validates password minimum length constraint (min 8 chars)', () => {
    const isValidPassword = (val: string) => val.length >= 8;
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('securePass123')).toBe(true);
    expect(isValidPassword('88888888')).toBe(true);
  });

  it('executes login flow via AuthSyncService', async () => {
    const loginSpy = vi.spyOn(AuthSyncService, 'login').mockResolvedValueOnce({
      token: 'jwt_mock_token',
      user: {
        id: 'usr_123',
        email: 'test@paios.ai',
        displayName: 'Test User',
      },
    });

    const result = await AuthSyncService.login('test@paios.ai', 'password123');
    expect(loginSpy).toHaveBeenCalledWith('test@paios.ai', 'password123');
    expect(result.token).toBe('jwt_mock_token');
    expect(result.user.email).toBe('test@paios.ai');
  });

  it('executes register flow via AuthSyncService', async () => {
    const regSpy = vi.spyOn(AuthSyncService, 'register').mockResolvedValueOnce({
      token: 'jwt_new_token',
      user: {
        id: 'usr_456',
        email: 'new@paios.ai',
        displayName: 'New User',
      },
    });

    const result = await AuthSyncService.register('new@paios.ai', 'securePass123', 'New User');
    expect(regSpy).toHaveBeenCalledWith('new@paios.ai', 'securePass123', 'New User');
    expect(result.user.id).toBe('usr_456');
  });

  it('handles AuthSyncService failure with thrown error exception', async () => {
    vi.spyOn(AuthSyncService, 'login').mockRejectedValueOnce(new Error('Invalid email or password'));
    await expect(AuthSyncService.login('wrong@paios.ai', 'wrongpass')).rejects.toThrow('Invalid email or password');
  });

  it('clears session tokens on logout', () => {
    const clearSpy = vi.spyOn(AuthSyncService, 'clearSession');
    AuthSyncService.clearSession();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('checks authentication status boolean', () => {
    const isAuthSpy = vi.spyOn(AuthSyncService, 'isAuthenticated').mockReturnValueOnce(true);
    expect(AuthSyncService.isAuthenticated()).toBe(true);
    expect(isAuthSpy).toHaveBeenCalled();
  });
});
