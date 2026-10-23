'use client'

import { useState } from 'react'
import type { BillingInterval, PriceTable } from '../lib/billing'
import type { Plan } from '../lib/plan'
import { TIER_CONTENT, TIER_NAMES, TIER_ORDER, type TierItem } from '../lib/tiers'

// Die zwei Stufen nebeneinander (mobil untereinander) mit Umschalter
// Monat/Jahr. Kaufen ist ein schlichtes Formular-POST an /api/stripe/checkout
// — ohne JavaScript bleibt der Monatspreis wählbar.

function Item({ item }: { item: TierItem }) {
  if (typeof item === 'string') return <li>{item}</li>
  return (
    <li>
      {item.text}
      <ul className="ms-sub">
        {item.sub.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </li>
  )
}

export function Plans({
  table,
  currentPlan,
}: {
  /** null = Preise gerade nicht abrufbar → keine Kaufknöpfe */
  table: PriceTable | null
  /** free = noch kein Abo → Kaufknöpfe; sonst Stufe markieren, keine Knöpfe */
  currentPlan: Plan
}) {
  const [interval, setBillingInterval] = useState<BillingInterval>('month')
  const isMember = currentPlan !== 'free'

  return (
    <>
      {!isMember && table ? (
        <div className="cr-head">
          <div className="ms-toggle" role="group" aria-label="Zahlweise">
            <button type="button" aria-pressed={interval === 'month'} onClick={() => setBillingInterval('month')}>
              Monat
            </button>
            <button type="button" aria-pressed={interval === 'year'} onClick={() => setBillingInterval('year')}>
              Jahr
            </button>
          </div>
          <p className="ms-gift" aria-live="polite">
            {interval === 'year' ? 'Im Jahresabo sind zwei Monate geschenkt.' : ''}
          </p>
        </div>
      ) : null}

      <div className="ms-grid">
        {TIER_ORDER.map((tier) => {
          const content = TIER_CONTENT[tier]
          const price = table?.[tier][interval]
          const current = currentPlan === tier
          return (
            <section
              key={tier}
              className={`ms-card${current ? ' ms-card--current' : ''}`}
              aria-labelledby={`tier-${tier}`}
            >
              <div className="ms-card-head">
                {current ? <span className="ms-badge">Deine Stufe</span> : null}
                <h2 id={`tier-${tier}`} className="ms-name">
                  {TIER_NAMES[tier]}
                </h2>
                <p className="ms-steps">
                  {content.essence} · {content.steps.join(' · ')}
                </p>
                {!isMember && price ? (
                  <p className="ms-price">
                    <span className="ms-amount">{price.amount}</span>
                    <span className="ms-per">{price.per}</span>
                  </p>
                ) : null}
              </div>

              <p className="ms-theme">{content.theme}</p>

              <ul className="ms-list">
                {content.items.map((item) => (
                  <Item key={typeof item === 'string' ? item : item.text} item={item} />
                ))}
              </ul>

              <p className="ms-feeling">{content.feeling}</p>

              {!isMember ? (
                <form method="post" action="/api/stripe/checkout">
                  <input type="hidden" name="kind" value="subscription" />
                  <input type="hidden" name="tier" value={tier} />
                  <input type="hidden" name="interval" value={interval} />
                  <button type="submit" className="cr-btn" disabled={!price}>
                    {TIER_NAMES[tier]} wählen
                  </button>
                </form>
              ) : null}
            </section>
          )
        })}
      </div>
    </>
  )
}
