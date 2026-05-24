import { days } from '../data/course-patterns'

type Row = {
  position: number
  day_number: number
  title: string
  kind: 'pattern' | 'kombi' | 'spielweg'
  pattern_data: unknown
}

const rows: Row[] = []
let pos = 0
for (const d of days) {
  for (const p of d.patterns) {
    rows.push({
      position: pos++,
      day_number: d.number,
      title: p.label,
      kind: 'pattern',
      // Compact ref — frontend resolves full pattern via (day_number, pattern_id) → course-patterns.ts
      pattern_data: {
        pattern_id: p.id,
        type: p.type ?? null,
        stage: p.stage ?? null,
        track: p.track ?? null,
        focus_takt: p.focus_takt ?? null,
      },
    })
  }
  if (d.kombi) {
    rows.push({
      position: pos++,
      day_number: d.number,
      title: `Kombi: ${d.kombi.name}`,
      kind: 'kombi',
      pattern_data: { name: d.kombi.name, rounds: d.kombi.rounds, sequence_length: d.kombi.sequence.length },
    })
  }
  if (d.options) {
    for (const o of d.options) {
      rows.push({
        position: pos++,
        day_number: d.number,
        title: `Spielweg: ${o.name}`,
        kind: 'spielweg',
        pattern_data: { option_id: o.id, bogen_count: o.structure.bogen_count, loop: o.structure.loop },
      })
    }
  }
}

const sqlEscape = (s: string) => s.replace(/'/g, "''")
const valuesSql = rows
  .map(
    (r) =>
      `((select id from public.programs where slug='rhythmusfundament'),${r.position},${r.day_number},'${sqlEscape(r.title)}','${r.kind}','${sqlEscape(JSON.stringify(r.pattern_data))}'::jsonb)`,
  )
  .join(',')

const sql = `delete from public.exercises where program_id=(select id from public.programs where slug='rhythmusfundament');
insert into public.exercises (program_id,position,day_number,title,kind,pattern_data) values
${valuesSql};
update public.programs set total_exercises=${rows.length} where slug='rhythmusfundament';`

Bun.write('/tmp/exercises-seed-compact.sql', sql)
console.error(`Generated ${rows.length} exercises — total ${sql.length} chars`)
