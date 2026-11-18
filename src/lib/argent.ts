/** 1250 → « 12,50 € », 1200 → « 12 € » */
export function formaterEuros(centimes: number): string {
  return (centimes / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: centimes % 100 === 0 ? 0 : 2,
  })
}

/** « 12 », « 12,5 », « 12.50 € » → centimes ; null si ce n'est pas un montant positif. */
export function lireMontant(texte: string): number | null {
  const nettoye = texte.replace(/[€\s]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(nettoye)) return null
  const centimes = Math.round(Number(nettoye) * 100)
  return centimes > 0 ? centimes : null
}
