import { useIsDark, useThemeColors } from '@/constants/theme';

/** Yalnizca beyaz cizgiden olusan, seffaf zeminli logolar (MotoGP, Moto2, Moto3). */
const WHITE_LOGO_FILES = ['gg3c201768486075', 'py0ez81768486001', 'jkm5v11768487097'];

export function isWhiteLogo(url: string | null | undefined): boolean {
  return Boolean(url && WHITE_LOGO_FILES.some((file) => url.includes(file)));
}

/** Acik temada beyaz logoyu metin rengine boyar; diger logolar oldugu gibi kalir. */
export function useLogoTint(url: string | null | undefined): string | undefined {
  const dark = useIsDark();
  const colors = useThemeColors();
  return !dark && isWhiteLogo(url) ? colors.ink : undefined;
}
