import { z } from 'zod';

import type { Translate } from '@/lib/i18n';

export function makeLoginSchema(t: Translate) {
  return z.object({
    email: z.string().trim().email(t('auth.emailInvalid')),
    password: z.string().min(6, t('auth.passwordMin')),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof makeLoginSchema>>;

export function makeSignUpSchema(t: Translate) {
  return makeLoginSchema(t).extend({
    fullName: z.string().trim().min(2, t('auth.fullNameMin')),
  });
}

export type SignUpFormValues = z.infer<ReturnType<typeof makeSignUpSchema>>;
