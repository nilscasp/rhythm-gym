'use client'

import { useFormStatus } from 'react-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Submit-Button mit Pending-Disable für Server-Action-Forms.
// Verhindert Doppel-Submits (Doppelklick → zwei Codes), ohne das umgebende
// Form aus der Server-Component zu reißen.
// ─────────────────────────────────────────────────────────────────────────────

export function PendingSubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode
  pendingLabel: string
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  )
}
