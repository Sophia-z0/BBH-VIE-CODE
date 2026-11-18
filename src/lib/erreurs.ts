/** Message lisible à partir d'une erreur Supabase ou JavaScript. */
export function messageErreur(erreur: unknown): string {
  if (erreur && typeof erreur === 'object' && 'message' in erreur) return String(erreur.message)
  return 'Oups, quelque chose a coincé. Réessaie ?'
}
