/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from '../../src/components/AuthModal';
import { AuthSyncService } from '../../src/services/AuthSyncService';

describe('Unit Test: AuthModal React Component', () => {
  const onCloseMock = vi.fn();
  const onSuccessMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render content when isOpen is false', () => {
    const { container } = render(
      <AuthModal isOpen={false} onClose={onCloseMock} onSuccess={onSuccessMock} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with Sign In tab by default when isOpen is true', () => {
    render(
      <AuthModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} />
    );

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    expect(screen.getByTestId('auth-tab-login')).toBeInTheDocument();
    expect(screen.getByTestId('auth-tab-register')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.queryByTestId('display-name-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-submit-btn')).toHaveTextContent(/Sign In/i);
  });

  it('switches between Sign In and Create Account tabs and displays Display Name input', async () => {
    render(
      <AuthModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} />
    );

    const registerTab = screen.getByTestId('auth-tab-register');
    await userEvent.click(registerTab);

    expect(screen.getByTestId('display-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('auth-submit-btn')).toHaveTextContent(/Create Account/i);

    const loginTab = screen.getByTestId('auth-tab-login');
    await userEvent.click(loginTab);

    expect(screen.queryByTestId('display-name-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('auth-submit-btn')).toHaveTextContent(/Sign In/i);
  });

  it('validates email format before submitting and displays error', async () => {
    render(
      <AuthModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} />
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitBtn = screen.getByTestId('auth-submit-btn');

    await userEvent.type(emailInput, 'invalid-email');
    await userEvent.type(passwordInput, 'validPassword123');
    await userEvent.click(submitBtn);

    expect(screen.getByTestId('auth-error-message')).toHaveTextContent(/valid email/i);
  });

  it('validates password length (minimum 8 characters) before submitting', async () => {
    render(
      <AuthModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} />
    );

    const emailInput = screen.getByTestId('email-input');
    const passwordInput = screen.getByTestId('password-input');
    const submitBtn = screen.getByTestId('auth-submit-btn');

    await userEvent.type(emailInput, 'valid@paios.ai');
    await userEvent.type(passwordInput, 'short');
    await userEvent.click(submitBtn);

    expect(screen.getByTestId('auth-error-message')).toHaveTextContent(/8 characters/i);
  });

  it('calls AuthSyncService.login and triggers onSuccess and onClose on successful login', async () => {
    const loginSpy = vi.spyOn(AuthSyncService, 'login').mockResolvedValueOnce({
      token: 'mock.token.jwt',
      user: { id: 'usr_1', email: 'test@paios.ai', displayName: 'Alex' },
    });

    render(
      <AuthModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} />
    );

    await userEvent.type(screen.getByTestId('email-input'), 'test@paios.ai');
    await userEvent.type(screen.getByTestId('password-input'), 'SecurePassword123');
    await userEvent.click(screen.getByTestId('auth-submit-btn'));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith('test@paios.ai', 'SecurePassword123');
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('calls AuthSyncService.register in register mode and handles submission', async () => {
    const registerSpy = vi.spyOn(AuthSyncService, 'register').mockResolvedValueOnce({
      token: 'mock.token.jwt.reg',
      user: { id: 'usr_2', email: 'newuser@paios.ai', displayName: 'New User' },
    });

    render(
      <AuthModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} />
    );

    await userEvent.click(screen.getByTestId('auth-tab-register'));

    await userEvent.type(screen.getByTestId('display-name-input'), 'New User');
    await userEvent.type(screen.getByTestId('email-input'), 'newuser@paios.ai');
    await userEvent.type(screen.getByTestId('password-input'), 'SecurePassword123');
    await userEvent.click(screen.getByTestId('auth-submit-btn'));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith('newuser@paios.ai', 'SecurePassword123', 'New User');
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message from backend when AuthSyncService throws an error', async () => {
    vi.spyOn(AuthSyncService, 'login').mockRejectedValueOnce(new Error('Invalid email or password'));

    render(
      <AuthModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} />
    );

    await userEvent.type(screen.getByTestId('email-input'), 'wrong@paios.ai');
    await userEvent.type(screen.getByTestId('password-input'), 'WrongPassword123');
    await userEvent.click(screen.getByTestId('auth-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-error-message')).toHaveTextContent(/Invalid email or password/i);
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });
});
