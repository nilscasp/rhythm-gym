'use client'

import { useState } from 'react'
import { slugify } from '../../lib/slug'
import { createPostAction, updatePostAction } from '../_post-actions'
import { PendingSubmitButton } from './PendingSubmitButton'

// ─────────────────────────────────────────────────────────────────────────────
// Ein Formular für Anlegen und Bearbeiten eines Beitrags (wie EventForm).
// Client-Component nur für eins: die Adresse (Slug) folgt dem Titel, bis man
// sie selbst ändert. Der Server bildet sie ohnehin noch einmal (slugify +
// uniqueSlug) — das hier ist Vorschau, keine Sicherung.
// ─────────────────────────────────────────────────────────────────────────────

const AUDIENCE_LABELS: Record<string, string> = {
  members: 'Alle mit Konto',
  premium: 'Ab Premium (auch VIP)',
  vip: 'Nur VIP',
}

export type PostFormValues = {
  id: string
  title: string
  slug: string
  bodyMd: string
  videoGuid: string
  audience: string
  published: boolean
}

export function PostForm({ post }: { post?: PostFormValues }) {
  const isEdit = Boolean(post)
  const [title, setTitle] = useState(post?.title ?? '')
  const [slug, setSlug] = useState(post?.slug ?? '')
  // Neu: Slug folgt dem Titel, bis er von Hand geändert wird.
  const [slugTouched, setSlugTouched] = useState(isEdit)

  return (
    <form action={isEdit ? updatePostAction : createPostAction} className="cch-event-form">
      {isEdit && <input type="hidden" name="id" value={post!.id} />}

      <label className="cch-code-field cch-event-field--wide">
        <span>Titel</span>
        <input
          type="text"
          name="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (!slugTouched) setSlug(slugify(e.target.value))
          }}
          maxLength={200}
          required
          placeholder="z. B. Was mich diese Woche bewegt"
        />
      </label>

      <label className="cch-code-field cch-event-field--wide">
        <span>Adresse (/beitraege/…)</span>
        <input
          type="text"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          maxLength={80}
          placeholder="wird aus dem Titel gebildet"
        />
        <small className="cch-event-hint">Leer lassen = aus dem Titel. Ist sie schon vergeben, kommt -2 dazu.</small>
      </label>

      <label className="cch-code-field cch-event-field--wide">
        <span>Text (Markdown)</span>
        <textarea
          name="body_md"
          defaultValue={post?.bodyMd ?? ''}
          rows={12}
          maxLength={40000}
          className="cch-post-body"
          placeholder={'Absätze mit Leerzeile.\n## Zwischenüberschrift\n- Aufzählung\n**fett**, *kursiv*'}
        />
      </label>

      <label className="cch-code-field">
        <span>Bunny-Video-GUID (optional)</span>
        <input
          type="text"
          name="video_guid"
          defaultValue={post?.videoGuid ?? ''}
          maxLength={36}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          spellCheck={false}
          autoCapitalize="off"
        />
      </label>

      <label className="cch-code-field">
        <span>Für wen</span>
        <select name="audience" defaultValue={post?.audience ?? 'members'} required>
          {Object.entries(AUDIENCE_LABELS).map(([value, labelText]) => (
            <option key={value} value={value}>
              {labelText}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="cch-code-field cch-event-field--wide cch-post-publish">
        <span>Veröffentlichen</span>
        <label className="cch-event-check">
          <input type="radio" name="publish" value="now" defaultChecked={post ? post.published : true} />
          <span>{post?.published ? 'Veröffentlicht lassen' : 'Sofort veröffentlichen'}</span>
        </label>
        <label className="cch-event-check">
          <input type="radio" name="publish" value="draft" defaultChecked={post ? !post.published : false} />
          <span>{post?.published ? 'Zurück zum Entwurf' : 'Als Entwurf speichern'}</span>
        </label>
      </fieldset>

      <div className="cch-event-submit">
        <PendingSubmitButton className="cch-code-create" pendingLabel="Speichere …">
          {isEdit ? 'Änderungen sichern' : 'Beitrag speichern'}
        </PendingSubmitButton>
      </div>
    </form>
  )
}
