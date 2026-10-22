import type { Metadata } from 'next'
import { CourseRoomPage } from '../_course/views'

// ─────────────────────────────────────────────────────────────────────────────
// /training/[slug] — Kursraum für jeden Kurs aus der DB (Migration 0010).
// Die statischen Pfade (rhythmusfundament, von-anfang-an-spielen) gewinnen
// gegenüber diesem dynamischen Segment. Unbekannte Slugs → notFound().
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Kurs — Handpan Schule des Lebens',
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <CourseRoomPage slug={slug} />
}
