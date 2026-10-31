import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'
import { getCourseAccess } from '../../../lib/course-access'
import { RF15_PDF, RF15_SLUG } from '../../../../data/rhythmusfundament-1-5-days'

// ─────────────────────────────────────────────────────────────────────────────
// GET /training/rhythmusfundament-1-5/fingerpyramide — Begleit-PDF.
//
// Liefert die Datei aus content/rhythmusfundament-1-5/ nur an Eingeschriebene
// aus. Unter public/ wäre sie für jeden mit dem Link offen.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', request.url))

  const access = await getCourseAccess(supabase, user.id, RF15_SLUG)
  if (!access.enrolled) return NextResponse.redirect(new URL('/training', request.url))

  if (!RF15_PDF.file) return new NextResponse('PDF folgt.', { status: 404 })

  try {
    const file = await fs.readFile(
      path.join(process.cwd(), 'content', 'rhythmusfundament-1-5', RF15_PDF.file),
    )
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${RF15_PDF.downloadName}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[rf15/fingerpyramide] PDF nicht lesbar', err)
    return new NextResponse('PDF nicht gefunden.', { status: 404 })
  }
}
