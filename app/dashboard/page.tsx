'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [patterns, setPatterns] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: patterns } = await supabase
        .from('patterns')
        .select('*')
        .order('level')
      setPatterns(patterns || [])
    }
    getData()
  }, [])

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-amber-400 mb-2">RHYTHM GYM</h1>
        <p className="text-gray-400 mb-8">Dein tägliches Training</p>
        
        {user && (
          <div className="mb-8 bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <p className="text-green-400 text-sm">✅ {user.email}</p>
          </div>
        )}

        <h2 className="text-xl font-bold text-white mb-4">Pattern Library</h2>
        <div className="flex flex-col gap-3">
          {patterns.map((p) => (
            <div key={p.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{p.name}</p>
                <p className="text-sm text-gray-500">Level {p.level} · {p.bpm} BPM · {p.category}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${p.tier === 'free' ? 'bg-green-900 text-green-400' : 'bg-amber-900 text-amber-400'}`}>
                {p.tier}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}