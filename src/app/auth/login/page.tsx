'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithEmail, signInWithGoogle } from '@/lib/auth'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'

type Mode = 'login' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await signInWithEmail(email, password)
      router.replace('/dashboard')
    } catch {
      setError('Invalid email or password')
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true); setError('')
    try {
      await signInWithGoogle()
      router.replace('/dashboard')
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') { setLoading(false); return }
      setError('Google sign-in failed')
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      await sendPasswordResetEmail(auth, email)
      setSuccess('Reset link sent — check your email')
    } catch {
      setError('Could not send reset email. Check the address and try again.')
    }
    setLoading(false)
  }

  const inp = "w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-400"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="font-display font-extrabold text-2xl text-gray-900 tracking-tight">
            Golf<span className="text-green-600">Group</span> OS
          </h1>
          <p className="text-sm text-gray-400 mt-1">The official history book of your golf group</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6">

          {mode === 'login' && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors mb-4 disabled:opacity-40"
              >
                <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">G</span>
                Continue with Google
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300 tracking-wider">OR</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <form onSubmit={handleEmail} className="space-y-3">
                <input className={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input className={inp} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-40">
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <button
                onClick={() => { setMode('forgot'); setError('') }}
                className="w-full text-center text-xs text-gray-400 mt-3 hover:text-gray-600 transition-colors"
              >
                Forgot your password?
              </button>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <button
                onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4"
              >
                ← Back to sign in
              </button>
              <h2 className="font-medium text-gray-900 mb-1">Reset your password</h2>
              <p className="text-xs text-gray-400 mb-4">We'll send a reset link to your email</p>
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input className={inp} type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required />
                {error && <p className="text-xs text-red-500">{error}</p>}
                {success && <p className="text-xs text-green-600">{success}</p>}
                <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-40">
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          No account?{' '}
          <a href="/auth/onboarding" className="text-green-600 font-medium">Create one — it's free</a>
        </p>
      </div>
    </div>
  )
}
