/** localStorage peut être indisponible (navigation privée…) : on ignore alors simplement. */
export function lireLocal(cle: string): string | null {
  try {
    return localStorage.getItem(cle)
  } catch {
    return null
  }
}

export function ecrireLocal(cle: string, valeur: string) {
  try {
    localStorage.setItem(cle, valeur)
  } catch {
    // préférence non mémorisée, sans conséquence
  }
}
