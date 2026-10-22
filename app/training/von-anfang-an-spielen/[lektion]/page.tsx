import type { Metadata } from 'next'
import { LessonPage } from '../../_course/views'

// /training/von-anfang-an-spielen/[lektion] — der statische Kursraum gewinnt
// gegen /training/[slug], darum braucht er für die Lektionen einen eigenen
// Kindpfad. Dieselbe Lektionsseite wie alle DB-Kurse.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lektion · Von Anfang an spielen — Handpan Schule des Lebens',
}

export default async function Page({ params }: { params: Promise<{ lektion: string }> }) {
  const { lektion } = await params
  return <LessonPage slug="von-anfang-an-spielen" lessonSlug={lektion} />
}
