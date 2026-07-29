import * as Linking from 'expo-linking';

/**
 * Where Supabase sends the user back to after they follow an email link
 * (sign-up confirmation, password recovery).
 *
 * Resolves to `sportpulse://` in a built app and to the Expo dev-server URL
 * while developing. Without this, Supabase falls back to the project's Site
 * URL — which defaults to http://localhost:3000 and leaves the user on a
 * dead page instead of back inside the app.
 *
 * The same URL must be allow-listed in the Supabase dashboard under
 * Authentication → URL Configuration → Redirect URLs.
 */
export function authRedirectUrl(): string {
  return Linking.createURL('/');
}
