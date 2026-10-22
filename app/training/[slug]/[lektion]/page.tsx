import type { Metadata } from 'next'
import { LessonPage } from '../../_course/views'

// /training/[slug]/[lektion] — eine Lektion eines DB-Kurses (Migration 0010).

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lektion — Handpan Schule des Lebens',
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; lektion: string }>
}) {
  const { slug, lektion } = await params
  return <LessonPage slug={slug} lessonSlug={lektion} />
}
