/** Logo oficial (mesma do app paciente). */
export const BRAND_LOGO_SRC = '/icons/logovetorcarregamento.svg'

export const BRAND_LOGO_NATURAL_WIDTH = 295
export const BRAND_LOGO_NATURAL_HEIGHT = 415

export function brandLogoWidthForHeight(height) {
  if (!height) return 0
  return (height * BRAND_LOGO_NATURAL_WIDTH) / BRAND_LOGO_NATURAL_HEIGHT
}

export function brandLogoSizeForHeight(height) {
  return {
    width: Math.round(brandLogoWidthForHeight(height)),
    height: Math.round(height),
  }
}
