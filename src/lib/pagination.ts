const TAILLE_PAGE = 1000 // limite par requête de Supabase

/** Récupère toutes les lignes d'une requête, page par page (Supabase en renvoie 1000 au plus). */
export async function toutesLesPages<T>(
  page: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const lignes: T[] = []
  for (let de = 0; ; de += TAILLE_PAGE) {
    const { data, error } = await page(de, de + TAILLE_PAGE - 1)
    if (error) throw error
    lignes.push(...(data ?? []))
    if (!data || data.length < TAILLE_PAGE) return lignes
  }
}
