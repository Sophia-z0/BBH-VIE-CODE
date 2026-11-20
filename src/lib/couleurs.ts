/**
 * Couleur du texte posé sur la couleur d'une personne : brun foncé sur une couleur claire
 * (pastels), blanc sur une couleur vive.
 */
export function texteSur(fond: string | undefined): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(fond ?? '')?.[1]
  if (!hex) return '#ffffff'
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.45 ? '#3b2416' : '#ffffff'
}
