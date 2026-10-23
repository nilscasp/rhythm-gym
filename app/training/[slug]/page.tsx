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

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  // Rückmeldung aus /api/stripe/checkout (?kauf=…), siehe courseCheckoutNotice.
  const kauf = typeof query.kauf === 'string' ? query.kauf : null
  return <CourseRoomPage slug={slug} kauf={kauf} />
}
