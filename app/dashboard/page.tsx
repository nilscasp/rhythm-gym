'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-amber-400 mb-2">RHYTHM GYM</h1>
        <p className="text-gray-400 mb-8">Dein tägliches Training</p>
        
        {user ? (
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <p className="text-green-400 text-sm mb-1">✅ Eingeloggt als</p>
            <p className="text-white font-medium">{user.email}</p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-zinc-800 rounded p-4 text-center">
                <div className="text-3xl font-bold text-amber-400">0</div>
                <div className="text-xs text-gray-500 mt-1">Streak Tage</div>
              </div>
              <div className="bg-zinc-800 rounded p-4 text-center">
                <div className="text-3xl font-bold text-amber-400">1</div>
                <div className="text-xs text-gray-500 mt-1">Level</div>
              </div>
              <div className="bg-zinc-800 rounded p-4 text-center">
                <div className="text-3xl font-bold text-amber-400">0</div>
                <div className="text-xs text-gray-500 mt-1">Sessions</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Lade...</p>
        )}
      </div>
    </main>
  )
}