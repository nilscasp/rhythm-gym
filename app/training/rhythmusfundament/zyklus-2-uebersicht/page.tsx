import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { getCourseAccess } from '../../../lib/course-access'
import { FIRST_DAY } from '../../../../data/course-patterns'
import {
  RhythmusfundamentClient,
  type ExerciseLite,
} from './RhythmusfundamentClient'

// ─────────────────────────────────────────────────────────────────────────────
// /training/rhythmusfundament — Server-Component shell.
// Auth-gates, loads the program + exercises + completed exercise_ids, then
// hands everything to the client course player. All Tone.js audio, spacebar
// shortcuts, BPM controls, and day switching live in RhythmusfundamentClient.
// ─────────────────────────────────────────────────────────────────────────────

const RHYTHMUSFUNDAMENT_SLUG = 'rhythmusfundament'

export const metadata = {
  title: 'Rhythmus-Fundament · Zyklus 2 Übersicht',
  description:
    'Tag-12-bis-22 Trainings-Übersicht (Closed Beta) — der reichere Player mit Stufen, Kombis und Spielwegen.',
}

type ProgramIdRow = { id: string }
type CompletionRow = { exercise_id: string }

export default async function RhythmusfundamentPage() {
  const supabase = await createClient()

  // A. Auth gate
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Kurs-Gate: ohne Einschreibung zurück zum Hub (gesperrte Karte mit Code-Feld).
  const access = await getCourseAccess(supabase, user.id, 'rhythmusfundament')
  if (!access.enrolled) redirect('/training')

  // Drip-Unlock: diese Übersicht beginnt bei Tag 12. Solange der noch
  // gesperrt ist, zurück zum Index (der zeigt die Freischalt-Daten).
  if (access.maxUnlockedDay < FIRST_DAY) redirect('/training/rhythmusfundament')

  // B. Program lookup
  const { data: programRow } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', RHYTHMUSFUNDAMENT_SLUG)
    .maybeSingle()

  const program: ProgramIdRow | null = (programRow as ProgramIdRow | null) ?? null

  // No program seed → render an empty client (still shows the day grid + UI
  // chrome, but no exercise IDs resolve so no checkboxes appear). Avoid a
  // hard 404 to keep the closed-beta course player reachable.
  if (!program) {
    return (
      <RhythmusfundamentClient
        exercises={[]}
        initialCompletedIds={[]}
        maxUnlockedDay={access.maxUnlockedDay}
      />
    )
  }

  // C. Parallel fetch: exercises for this program + the user's completions
  // (filtered to those exercise IDs so we don't drag in unrelated programs).
  const [exercisesRes, completionsRes] = await Promise.all([
    supabase
      .from('exercises')
      .select('id, kind, day_number, position, pattern_data')
      .eq('program_id', program.id)
      .order('position', { ascending: true }),
    supabase
      .from('completions')
      .select('exercise_id, exercises!inner(program_id)')
      .eq('user_id', user.id)
      .eq('exercises.program_id', program.id),
  ])

  // Drip-Unlock: Übungen gesperrter Tage gar nicht erst an den Client geben.
  const exercises: ExerciseLite[] = (
    (exercisesRes.data as ExerciseLite[] | null) ?? []
  ).filter((ex) => ex.day_number === null || ex.day_number <= access.maxUnlockedDay)
  const completionRows: CompletionRow[] =
    (completionsRes.data as CompletionRow[] | null) ?? []
  const initialCompletedIds: string[] = completionRows.map((r) => r.exercise_id)

  return (
    <RhythmusfundamentClient
      exercises={exercises}
      initialCompletedIds={initialCompletedIds}
      maxUnlockedDay={access.maxUnlockedDay}
    />
  )
}
