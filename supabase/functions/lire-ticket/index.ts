// Fonction Supabase « lire-ticket » (Deno) : lit la photo d'un ticket de caisse avec Claude
// et renvoie le magasin, la date et les articles. La photo n'est ni stockée ni journalisée.
// Secret attendu (Edge Functions › Secrets) : ANTHROPIC_API_KEY.
// « Verify JWT » reste activé : seules les personnes connectées à l'app peuvent l'appeler.

import Anthropic from 'npm:@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Photo de 6 Mo au plus une fois encodée (l'app l'a déjà réduite). */
const TAILLE_MAX_BASE64 = 8_000_000

const SCHEMA = {
  type: 'object',
  properties: {
    magasin: { type: 'string', description: 'Nom du magasin, ou chaîne vide si illisible.' },
    date: { type: 'string', description: 'Date d’achat au format AAAA-MM-JJ, ou chaîne vide si illisible.' },
    articles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          libelle: { type: 'string', description: 'Nom de l’article, réécrit lisiblement en français.' },
          montant_cents: { type: 'integer', description: 'Prix payé pour la ligne, en centimes ; négatif pour une remise.' },
        },
        required: ['libelle', 'montant_cents'],
        additionalProperties: false,
      },
    },
    total_cents: { type: 'integer', description: 'Total payé imprimé sur le ticket, en centimes, ou 0 si illisible.' },
  },
  required: ['magasin', 'date', 'articles', 'total_cents'],
  additionalProperties: false,
}

const CONSIGNE = `Voici la photo d'un ticket de caisse français.
Liste chaque ligne d'article acheté, dans l'ordre du ticket, avec le prix payé pour la ligne
(quantité comprise). Réécris les libellés abrégés en français lisible et court
(« BEUR DX 250G » → « Beurre doux 250 g »), 40 caractères au plus.
Une remise ou un bon de réduction est une ligne à montant négatif, juste après l'article concerné.
N'inclus pas les lignes de total, sous-total, TVA, moyen de paiement, rendu monnaie ni fidélité.
Si la photo n'est pas un ticket de caisse, renvoie une liste d'articles vide.`

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reponse({ erreur: 'méthode non permise' }, 405)

  let image: unknown
  try {
    ;({ image } = await req.json())
  } catch {
    return reponse({ erreur: 'corps de requête invalide' }, 400)
  }
  if (typeof image !== 'string' || image.length === 0 || image.length > TAILLE_MAX_BASE64) {
    return reponse({ erreur: 'photo manquante ou trop lourde' }, 400)
  }

  try {
    // Claude Haiku 5.5 : le plus petit modèle, environ 0,1 centime par ticket ; effort bas pour limiter la réflexion.
    const message = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: CONSIGNE },
          ],
        },
      ],
    })

    if (message.stop_reason === 'refusal') return reponse({ erreur: 'lecture refusée' }, 422)
    const texte = message.content.find((bloc) => bloc.type === 'text')
    if (!texte || texte.type !== 'text') return reponse({ erreur: 'réponse vide' }, 502)
    return reponse(JSON.parse(texte.text))
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return reponse({ erreur: 'trop de tickets d’un coup, réessaie dans une minute' }, 429)
    if (e instanceof Anthropic.APIError) return reponse({ erreur: `lecture impossible (${e.status})` }, 502)
    return reponse({ erreur: 'lecture impossible' }, 500)
  }
})
