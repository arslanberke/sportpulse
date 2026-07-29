import type { EmailOtpType } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { supabase } from '@/services/supabase';

/**
 * Supabase returns its tokens either in the query string (PKCE `code`,
 * or `token_hash` for one-time links) or in the URL fragment (implicit
 * flow), depending on the project's flow type and the kind of link.
 * Reading both keeps the handler working across all of them.
 */
function paramsFrom(url: string): URLSearchParams {
  const [beforeFragment, fragment = ''] = url.split('#');
  const query = beforeFragment.split('?')[1] ?? '';
  const joined = [query, fragment].filter(Boolean).join('&');
  return new URLSearchParams(joined);
}

async function completeAuth(url: string): Promise<void> {
  const params = paramsFrom(url);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return;
  }

  const code = params.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return;
  }

  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (tokenHash && type) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
  }
}

/**
 * Completes sign-in when the app is opened from a Supabase email link.
 * Handles both a cold start (the link launched the app) and a warm one
 * (the app was already running). Mount once, in the root layout.
 *
 * Failures are swallowed on purpose: an expired or already-used link
 * should leave the user on the login screen, not crash the app.
 */
export function useAuthDeepLink() {
  useEffect(() => {
    let cancelled = false;

    void Linking.getInitialURL().then((url) => {
      if (!cancelled && url) void completeAuth(url).catch(() => {});
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void completeAuth(url).catch(() => {});
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
