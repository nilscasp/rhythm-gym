'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '../../../lib/supabase'

export default function LoginPage() {
  const supabase = createClient()

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        <h1 className="text-4xl font-bold text-amber-400 text-center mb-8">
          RHYTHM GYM
        </h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={[]}
          redirectTo="http://localhost:3000/dashboard"
        />
      </div>
    </main>
  )
}