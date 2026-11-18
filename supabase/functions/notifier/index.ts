// Fonction Supabase « notifier » (Deno), appelée tous les quarts d'heure par pg_cron.
// Envoie le rappel quotidien, le rappel du dimanche 12h et l'annonce du dimanche 18h.
// Secrets attendus (Edge Functions › Secrets) : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (ex. mailto:toi@exemple.fr), CRON_SECRET.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

interface Message {
  title: string
  body: string
  /** Écran à ouvrir, relatif à l'app (HashRouter). */
  url: string
  actions?: { action: string; title: string }[]
}

interface Profil {
  id: string
  household_id: string
  notif_daily: boolean
  notif_daily_time: string
  notif_sunday: boolean
}

const QUART_HEURE_MS = 15 * 60_000

/** Heure murale de Paris. */
function heureParis(instant: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  )
  return {
    annee: Number(parts.year),
    mois: Number(parts.month),
    jour: Number(parts.day),
    heure: Number(parts.hour),
    minute: Number(parts.minute),
    dimanche: parts.weekday === 'Sun',
  }
}

/** Minuit (heure de Paris) du jour de l'instant donné. */
function minuitParis(instant: Date): Date {
  const m = heureParis(instant)
  const decalage = Date.UTC(m.annee, m.mois - 1, m.jour, m.heure, m.minute) - Math.floor(instant.getTime() / 60_000) * 60_000
  return new Date(Date.UTC(m.annee, m.mois - 1, m.jour) - decalage)
}

async function aLogueDepuis(table: 'task_logs' | 'expenses', colonne: string, idPersonne: string, depuis: Date) {
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', idPersonne)
    .gte(colonne, depuis.toISOString())
  return (count ?? 0) > 0
}

/** Rappel quotidien : ne demande que ce qui n'a pas encore été logué aujourd'hui. */
async function rappelDuJour(profil: Profil, minuit: Date): Promise<Message | null> {
  const [tache, depense] = await Promise.all([
    aLogueDepuis('task_logs', 'done_at', profil.id, minuit),
    aLogueDepuis('expenses', 'spent_at', profil.id, minuit),
  ])
  if (tache && depense) return null
  if (tache) return { title: 'Petit point du jour 💖', body: 'As-tu dépensé pour ton foyer aujourd’hui ?', url: '#/depenses' }
  if (depense) return { title: 'Petit point du jour ⭐', body: 'As-tu réalisé une tâche ménagère aujourd’hui ?', url: '#/' }
  return {
    title: 'Petit point du jour ✨',
    body: 'As-tu réalisé une tâche ménagère aujourd’hui ? Et dépensé pour ton foyer ?',
    url: '#/',
    actions: [
      { action: 'tache', title: '⭐ une tâche' },
      { action: 'depense', title: '💖 une dépense' },
    ],
  }
}

const RAPPEL_DIMANCHE: Message = {
  title: 'Dernière ligne droite 🏁',
  body: 'As-tu pensé à loguer tes tâches et dépenses de la semaine ? Résultats à 18h 🎁',
  url: '#/',
}

/** Annonce du dimanche 18h : toujours positive, quel que soit le résultat. */
async function annonceDuDimanche(householdId: string, finSemaine: Date): Promise<Message> {
  const { data } = await supabase.rpc('weekly_winners', { hid: householdId, fin: finSemaine.toISOString() })
  const gagnants = (data ?? []) as string[]
  if (gagnants.length === 1) {
    return {
      title: `👑 ${gagnants[0]} remporte la semaine !`,
      body: 'Bravo, et merci à vous deux pour tout ce que vous faites 💖 Viens ouvrir les résultats 🎁',
      url: '#/podium',
    }
  }
  if (gagnants.length > 1) {
    return { title: '🎉 Match nul !', body: 'Bravo à vous deux, quelle équipe ! Viens ouvrir les résultats 🎁', url: '#/podium' }
  }
  return { title: '🎁 Les résultats de la semaine sont là', body: 'Une nouvelle semaine commence, à vous de jouer ✨', url: '#/podium' }
}

async function envoyer(idPersonne: string, message: Message): Promise<number> {
  const { data: abonnements } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', idPersonne)
  let envoyes = 0
  for (const a of abonnements ?? []) {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(message), {
        TTL: 3600,
      })
      envoyes++
    } catch (e) {
      // Appareil désabonné ou abonnement expiré : on l'oublie.
      const statut = (e as { statusCode?: number }).statusCode
      if (statut === 404 || statut === 410) await supabase.from('push_subscriptions').delete().eq('endpoint', a.endpoint)
      else console.error('envoi impossible', statut, e)
    }
  }
  return envoyes
}

Deno.serve(async (requete) => {
  if (requete.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('accès refusé', { status: 401 })
  }

  // Créneau du quart d'heure en cours (pg_cron appelle à :00, :15, :30, :45).
  const creneau = new Date(Math.floor(Date.now() / QUART_HEURE_MS) * QUART_HEURE_MS)
  const paris = heureParis(creneau)
  const hhmm = `${String(paris.heure).padStart(2, '0')}:${String(paris.minute).padStart(2, '0')}:00`
  const minuit = minuitParis(creneau)

  const { data: profils, error } = await supabase.from('profiles').select('id, household_id, notif_daily, notif_daily_time, notif_sunday')
  if (error) return new Response(error.message, { status: 500 })

  const annonces = new Map<string, Message>() // une annonce par foyer
  let envoyes = 0
  for (const profil of profils as Profil[]) {
    const messages: Message[] = []

    if (profil.notif_daily && profil.notif_daily_time === hhmm) {
      const rappel = await rappelDuJour(profil, minuit)
      if (rappel) messages.push(rappel)
    }
    if (profil.notif_sunday && paris.dimanche && hhmm === '12:00:00') messages.push(RAPPEL_DIMANCHE)
    if (profil.notif_sunday && paris.dimanche && hhmm === '18:00:00') {
      if (!annonces.has(profil.household_id)) annonces.set(profil.household_id, await annonceDuDimanche(profil.household_id, creneau))
      messages.push(annonces.get(profil.household_id)!)
    }

    for (const message of messages) envoyes += await envoyer(profil.id, message)
  }

  return Response.json({ creneau: hhmm, envoyes })
})
