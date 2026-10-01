import { isAuthError } from '@supabase/supabase-js';

import type { Translate } from '@/lib/i18n';

const AUTH_ERROR_KEYS = {
  email_not_confirmed: 'auth.errorEmailNotConfirmed',
  invalid_credentials: 'auth.errorInvalidCredentials',
  user_already_exists: 'auth.errorUserExists',
  email_exists: 'auth.errorUserExists',
  weak_password: 'auth.errorWeakPassword',
  over_email_send_rate_limit: 'auth.errorRateLimit',
  over_request_rate_limit: 'auth.errorRateLimit',
} as const satisfies Record<string, Parameters<Translate>[0]>;

/** Supabase auth hatasini kullanicinin dilinde bir mesaja cevirir. */
export function authErrorMessage(error: unknown, t: Translate): string {
  if (isAuthError(error) && error.code && error.code in AUTH_ERROR_KEYS) {
    return t(AUTH_ERROR_KEYS[error.code as keyof typeof AUTH_ERROR_KEYS]);
  }
  return t('common.tryAgain');
}
