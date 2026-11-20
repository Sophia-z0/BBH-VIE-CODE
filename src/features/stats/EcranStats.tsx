import { useMemo, useState, type ReactNode } from 'react'
import { BarreRepartition } from '../../components/BarreRepartition'
import { classePuce } from '../../components/Puce'
import { decomposer, estPremierMois, jourParis } from '../../domain/calendrier'
import { formaterEtoiles } from '../../domain/etoiles'
import { type Badge, badgesDePersonne, derniereSemaineRevelee, moisDe, resultatCoeurs, resultatEtoiles } from '../../domain/scores'
import {
  achatsParEtiquette,
  dansPeriode,
  depensesParCategorie,
  depensesParMois,
  etoilesParGroupe,
  etoilesParTache,
  nombreDeLogs,
  partDuRevenu,
  periode,
  type Periode,
} from '../../domain/stats'
import { formaterEuros } from '../../lib/argent'
import { PhraseReport } from '../../components/PhraseReport'
import { contexteRevenus, reportPour, trimestreDe } from '../../domain/revenus'
import { useFoyerPret } from '../foyer/FoyerContext'
import { useDonneesStats, type DonneesStats } from './useDonneesStats'

type Choix = 'semaine' | 'mois' | 'tout'

const pourcent = (x: number) => `${Math.round(x * 100)} %`
const jjmmaaaa = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' })
const fois = (n: number) => `${n} fois`

/** Statistiques sur les données révélées : répartition des tâches, des dépenses, habitudes d'achat. */
export function EcranStats() {
  const { donnees, erreur } = useDonneesStats()
  if (erreur) return <p className="mt-10 rounded-xl bg-red-100 p-4 text-red-800">{erreur}</p>
  if (!donnees) return <p className="mt-20 animate-pulse text-center text-4xl">📊</p>
  return <Stats donnees={donnees} />
}

function Stats({ donnees }: { donnees: DonneesStats }) {
  const { membres } = useFoyerPret()
  const [choix, setChoix] = useState<Choix>('mois')
  const [moisChoisi, setMoisChoisi] = useState(() => {
    const { annee, mois } = decomposer(jourParis(new Date(donnees.dernierReveal.getTime() - 1)))
    return { annee, mois }
  })

  const p: Periode = useMemo(() => {
    if (choix === 'semaine') {
      const s = derniereSemaineRevelee()
      return periode(s.debut, s.fin, donnees.dernierReveal)
    }
    if (choix === 'mois') {
      const m = moisDe(moisChoisi.annee, moisChoisi.mois)
      return periode(m.debut, m.fin, donnees.dernierReveal)
    }
    const dates = [...donnees.logs.map((l) => l.done_at), ...donnees.depenses.map((d) => d.spent_at), ...donnees.cadeaux.map((c) => c.given_at)]
    const premiere = dates.length > 0 ? new Date(dates.reduce((a, b) => (a < b ? a : b))) : donnees.dernierReveal
    return periode(premiere, donnees.dernierReveal, donnees.dernierReveal)
  }, [choix, moisChoisi, donnees])

  const logs = donnees.logs.filter((l) => dansPeriode(l.done_at, p))
  const depenses = donnees.depenses.filter((d) => dansPeriode(d.spent_at, p))
  const cadeaux = donnees.cadeaux.filter((c) => dansPeriode(c.given_at, p))

  const etoiles = resultatEtoiles(membres, logs, donnees.absences, p.nuits)
  const contexte = contexteRevenus(membres, donnees.revenus, donnees.depenses, p.debut, p.fin)
  const coeurs = resultatCoeurs(membres, depenses, cadeaux, contexte)
  const revenus = partDuRevenu(membres, depenses, p.nuits.length, contexte.reference)
  const report = donnees.revenus.length > 0 ? reportPour(membres, donnees.revenus, donnees.depenses, trimestreDe(new Date(p.fin.getTime() - 1))) : null

  function changerMois(delta: number) {
    if (delta < 0 && estPremierMois(moisChoisi.annee, moisChoisi.mois)) return
    const d = new Date(Date.UTC(moisChoisi.annee, moisChoisi.mois - 1 + delta, 1))
    setMoisChoisi({ annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1 })
  }
  const nomMois = new Date(Date.UTC(moisChoisi.annee, moisChoisi.mois - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const moisSuivantRevele = moisDe(moisChoisi.annee, moisChoisi.mois).fin < donnees.dernierReveal

  return (
    <div className="flex flex-col gap-6 pt-4">
      <h1 className="text-2xl font-bold">📊 statistiques</h1>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['semaine', 'semaine dernière'],
            ['mois', 'par mois'],
            ['tout', 'depuis le début'],
          ] as const
        ).map(([valeur, libelle]) => (
          <button key={valeur} type="button" className={classePuce(choix === valeur)} onClick={() => setChoix(valeur)}>
            {libelle}
          </button>
        ))}
      </div>

      {choix === 'mois' && (
        <div className="flex items-center justify-between">
          <button type="button" aria-label="mois précédent" className="px-3 text-2xl disabled:opacity-20" disabled={estPremierMois(moisChoisi.annee, moisChoisi.mois)} onClick={() => changerMois(-1)}>
            ‹
          </button>
          <span className="font-semibold">{nomMois}</span>
          <button type="button" aria-label="mois suivant" className="px-3 text-2xl disabled:opacity-20" disabled={!moisSuivantRevele} onClick={() => changerMois(1)}>
            ›
          </button>
        </div>
      )}

      <p className="text-xs text-encre/50">
        {p.nuits.length > 0
          ? `Du ${jjmmaaaa(p.debut)} au ${jjmmaaaa(new Date(p.fin.getTime() - 1))} (${p.nuits.length} nuits), jusqu'au dernier reveal.`
          : 'Rien de révélé sur cette période pour l’instant.'}
      </p>

      <Carte titre="⚖️ équilibre global">
        {membres.map((personne) => {
          const e = etoiles.scores.find((s) => s.personne.id === personne.id)!
          const c = coeurs.scores.find((s) => s.personne.id === personne.id)!
          const g = coeurs.cadeaux.find((x) => x.personne.id === personne.id)!
          const r = revenus.find((x) => x.personne.id === personne.id)!
          return (
            <div key={personne.id} className="flex flex-col gap-1 rounded-2xl bg-creme p-3 text-sm">
              <p className="font-bold" style={{ color: personne.color }}>
                ● {personne.display_name}
              </p>
              <p>🏠 {e.nuits} nuit{e.nuits > 1 ? 's' : ''} à la maison</p>
              <p>
                ⭐ {pourcent(e.part)} des tâches ({formaterEtoiles(e.etoiles)} étoiles, {formaterEtoiles(e.parNuit)} par nuit)
              </p>
              <p>
                💖 {pourcent(c.partReelle)} des dépenses ({formaterEuros(c.depense)}) · part juste {pourcent(c.partJusteAjustee)}
              </p>
              {g.nombre > 0 && (
                <p>
                  🎁 {g.nombre} cadeau{g.nombre > 1 ? 'x' : ''} ({formaterEuros(g.montant)} estimés)
                </p>
              )}
              <p className="text-xs text-encre/50">
                {Number.isNaN(r.valeur)
                  ? 'revenu non renseigné'
                  : `revenu moyen (6 mois) ${formaterEuros(contexte.reference.get(personne.id) ?? 0)} / mois · dépenses du foyer ≈ ${pourcent(r.valeur)} du revenu`}
              </p>
            </div>
          )
        })}
        {report && membres.length === 2 && <PhraseReport report={report} personnes={membres} />}
        {!coeurs.surRevenus && membres.length === 2 && (
          <p className="text-xs text-encre/50">Part juste à 50/50 tant que les deux revenus ne sont pas renseignés (réglages).</p>
        )}
      </Carte>

      <Carte titre="⭐ tâches">
        <BarreRepartition libelle="part de la charge (ajustée à la présence)" parPersonne={etoiles.scores.map((s) => ({ personne: s.personne, valeur: s.parNuit }))} formater={(v) => `${formaterEtoiles(v)}/nuit`} />
        <BarreRepartition libelle="nombre de tâches faites" parPersonne={nombreDeLogs(membres, logs)} formater={fois} />
        <SousTitre>par groupe</SousTitre>
        {etoilesParGroupe(membres, logs, donnees.taches).map((l) => (
          <BarreRepartition key={l.cle} libelle={l.libelle} parPersonne={l.parPersonne} formater={(v) => `${formaterEtoiles(v)} ⭐`} />
        ))}
        <SousTitre>qui fait quoi</SousTitre>
        <ListeDepliable
          lignes={etoilesParTache(membres, logs, donnees.taches).map((l) => (
            <BarreRepartition key={l.cle} emoji={l.emoji} libelle={l.libelle} parPersonne={l.parPersonne} formater={(v) => `${formaterEtoiles(v)} ⭐`} />
          ))}
        />
      </Carte>

      <Badges donnees={donnees} />

      <Carte titre="💖 dépenses">
        <BarreRepartition libelle="total" parPersonne={coeurs.scores.map((s) => ({ personne: s.personne, valeur: s.depense }))} formater={formaterEuros} />
        <SousTitre>par catégorie</SousTitre>
        {depensesParCategorie(membres, depenses, donnees.categories).map((l) => (
          <BarreRepartition key={l.cle} emoji={l.emoji} libelle={l.libelle} parPersonne={l.parPersonne} formater={formaterEuros} />
        ))}
        {choix === 'tout' && (
          <>
            <SousTitre>par mois</SousTitre>
            {depensesParMois(membres, depenses).map((l) => (
              <BarreRepartition key={l.cle} libelle={l.libelle} parPersonne={l.parPersonne} formater={formaterEuros} />
            ))}
          </>
        )}
      </Carte>

      <Carte titre="🏷️ habitudes d'achat">
        <p className="text-xs text-encre/50">Qui achète quoi, d'après les étiquettes ajoutées aux dépenses.</p>
        <ListeDepliable
          lignes={achatsParEtiquette(membres, depenses).map((l) => (
            <BarreRepartition key={l.cle} libelle={l.libelle} parPersonne={l.parPersonne} formater={fois} />
          ))}
        />
      </Carte>
    </div>
  )
}

/** Badges des deux, côte à côte, sur tout l'historique révélé (pas seulement la période choisie). */
function Badges({ donnees }: { donnees: DonneesStats }) {
  const { membres } = useFoyerPret()
  const groupesParTache = new Map(donnees.taches.map((t) => [t.id, t.group_name]))
  const parPersonne = membres.map((personne) => ({
    personne,
    badges: badgesDePersonne(personne.id, donnees.logs, donnees.depenses, donnees.cadeaux, groupesParTache),
  }))
  const [premiere] = parPersonne
  if (!premiere) return null
  return (
    <Carte titre="🎖️ badges">
      <p className="text-xs text-encre/50">Sur tout l'historique, jusqu'au dernier reveal.</p>
      <div className="grid items-center gap-x-2 gap-y-3 text-sm" style={{ gridTemplateColumns: `1fr repeat(${parPersonne.length}, 4.5rem)` }}>
        <span />
        {parPersonne.map(({ personne }) => (
          <span key={personne.id} className="truncate text-center text-xs font-bold" style={{ color: personne.color }}>
            {personne.display_name}
          </span>
        ))}
        {premiere.badges.map((badge, i) => (
          <BadgeLigne key={badge.titre} titre={badge.titre} cellules={parPersonne.map(({ personne, badges }) => ({ id: personne.id, badge: badges[i] }))} />
        ))}
      </div>
    </Carte>
  )
}

function BadgeLigne({ titre, cellules }: { titre: string; cellules: { id: string; badge: Badge }[] }) {
  return (
    <>
      <span className="leading-tight">{titre}</span>
      {cellules.map(({ id, badge }) => (
        <span key={id} className="flex flex-col items-center leading-none">
          <span className={`text-2xl ${badge.obtenu ? '' : 'opacity-30 grayscale'}`}>{badge.emoji}</span>
          {!badge.obtenu && badge.progres && (
            <span className="mt-1 text-[10px] text-encre/50">
              {formaterEtoiles(badge.progres.actuel)} / {badge.progres.cible}
            </span>
          )}
        </span>
      ))}
    </>
  )
}

function Carte({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">{titre}</h2>
      {children}
    </section>
  )
}

function SousTitre({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 text-sm font-bold uppercase tracking-wide text-encre/50">{children}</h3>
}

/** Affiche les 8 premières lignes, le reste sur demande. */
function ListeDepliable({ lignes }: { lignes: ReactNode[] }) {
  const [tout, setTout] = useState(false)
  if (lignes.length === 0) return <p className="text-sm text-encre/50">Rien pour l'instant.</p>
  return (
    <>
      {tout ? lignes : lignes.slice(0, 8)}
      {lignes.length > 8 && (
        <button type="button" className="text-sm text-encre/60 underline" onClick={() => setTout(!tout)}>
          {tout ? 'voir moins' : `voir les ${lignes.length}`}
        </button>
      )}
    </>
  )
}
