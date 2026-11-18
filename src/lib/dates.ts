/** Valeur attendue par <input type="datetime-local"> (heure locale de l'appareil). */
export function versChampDateHeure(date: Date): string {
  const decale = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return decale.toISOString().slice(0, 16)
}

/** « mer. 18/11 à 14h32 » */
export function formaterJourHeure(iso: string): string {
  const date = new Date(iso)
  const jour = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
  return `${jour} à ${heure}`
}
