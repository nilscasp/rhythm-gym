'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

function PatternGrid({ grid }: { grid: number[] }) {
  return (
    <div className="flex gap-1 mt-3">
      {grid.map((beat, i) => (
        <div
          key={i}
          className={`h-8 flex-1 rounded-sm ${
            beat === 1
              ? i % 4 === 0
                ? 'bg-amber-400'
                : 'bg-amber-600'
              : 'bg-zinc-700'
          }`}
        />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [patterns, setPatterns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const { data: patterns } = await supabase
        .from('patterns')
        .select('*')
        .order('level')
      setPatterns(patterns || [])
      setLoading(false)
    }
    getData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-amber-400">Laden...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-amber-400">RHYTHM GYM</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-white border border-zinc-700 px-3 py-1 rounded transition-colors"
          >
            Logout
          </button>
        </div>
        <p className="text-gray-400 mb-8">Dein tägliches Training</p>
        
        <div className="mb-8 bg-zinc-900 rounded-lg p-4 border border-zinc-800">
          <p className="text-green-400 text-sm">✅ {user.email}</p>
        </div>

        <h2 className="text-xl font-bold text-white mb-4">Pattern Library</h2>
        <div className="flex flex-col gap-4">
          {patterns.map((p) => (
            <div key={p.id} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="text-sm text-gray-500">Level {p.level} · {p.bpm} BPM · {p.category}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${p.tier === 'free' ? 'bg-green-900 text-green-400' : 'bg-amber-900 text-amber-400'}`}>
                  {p.tier}
                </span>
              </div>
              <PatternGrid grid={p.grid} />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}