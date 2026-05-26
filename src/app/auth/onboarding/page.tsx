'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signUpWithEmail, signInWithGoogle, getInitials } from '@/lib/auth'
import { createGroup, getGroupByInviteCode, addMemberToGroup } from '@/lib/db'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { RoundFormat } from '@/types'
import clsx from 'clsx'

type Step = 'account' | 'group-choice' | 'create-group' | 'add-members' | 'join-group' | 'done'

const FORMATS: { value: RoundFormat; label: string }[] = [
  { value: 'stroke', label: 'Stroke play' },
  { value: 'match',  label: 'Match play' },
  { value: 'skins',  label: 'Skins' },
  { value: 'nassau', label: 'Nassau' },
]

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const existingUid = searchParams.get('uid') ?? ''

  const [step, setStep]           = useState<Step>('account')
  const [uid, setUid]             = useState('')
  const [groupId, setGroupId]     = useState('')
  const [createdCode, setCreatedCode] = useState('')

  // Account fields
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [handicap, setHandicap]   = useState('18')

  // Group fields
  const [groupName, setGroupName] = useState('')
  const [homeCourse, setHome]     = useState('')
  const [format, setFormat]       = useState<RoundFormat>('stroke')
  const [members, setMembers]     = useState<{ name: string; hcp: string }[]>([])
  const [newName, setNewName]     = useState('')
  const [newHcp, setNewHcp]       = useState('')

  // Join
  const [joinCode, setJoinCode]   = useState('')
  const [foundGroup, setFound]    = useState<{ id: string; name: string } | null>(null)

  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  // If coming from dashboard redirect (existing Google user, no group)
  useEffect(() => {
    if (existingUid) {
      setUid(existingUid)
      setStep('group-choice')
    }
  }, [existingUid])

  async function handleGoogleSignUp() {
    setLoading(true); setError('')
    try {
      const user = await signInWithGoogle()
      setUid(user.uid)
      setName(user.displayName ?? '')
      setEmail(user.email ?? '')
      setStep('group-choice')
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') { setLoading(false); return }
      setError('Google sign-up failed')
    }
    setLoading(false)
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const user = await signUpWithEmail(email, password, name, parseFloat(handicap) || 18)
      setUid(user.uid)
      setStep('group-choice')
    } catch {
      setError('Could not create account. That email may already be in use.')
    }
    setLoading(false)
  }

  async function handleCreateGroup() {
    setLoading(true); setError('')
    try {
      const id = await createGroup({
        name: groupName,
        createdBy: uid,
        members: [{
          userId: uid,
          displayName: name || 'Admin',
          handicap: parseFloat(handicap) || 18,
          isAdmin: true,
          isClaimed: true,
          initials: getInitials(name || 'Admin'),
          colorIndex: 0,
        }],
        homeCourse,
        seasonStart: 1,
        defaultFormat: format,
      })
      await updateDoc(doc(db, 'users', uid), { groups: arrayUnion(id) })
      setGroupId(id)
      setStep('add-members')
    } catch {
      setError('Could not create group. Try again.')
    }
    setLoading(false)
  }

  async function handleAddMembers() {
    setLoading(true)
    for (let i = 0; i < members.length; i++) {
      const m = members[i]
      await addMemberToGroup(groupId, {
        userId: `ghost_${Date.now()}_${i}`,
        displayName: m.name,
        handicap: parseFloat(m.hcp) || 18,
        isAdmin: false,
        isClaimed: false,
        initials: getInitials(m.name),
        colorIndex: (i + 1) % 4,
      })
    }
    setLoading(false)
    setStep('done')
  }

  async function handleLookup() {
    setLoading(true); setError('')
    try {
      const g = await getGroupByInviteCode(joinCode)
      if (!g) { setError('Code not found — double check it'); setLoading(false); return }
      setFound({ id: g.id, name: g.name })
    } catch {
      setError('Lookup failed. Try again.')
    }
    setLoading(false)
  }

  async function handleJoin() {
    if (!foundGroup) return
    setLoading(true)
    await addMemberToGroup(foundGroup.id, {
      userId: uid,
      displayName: name || 'Golfer',
      handicap: parseFloat(handicap) || 18,
      isAdmin: false,
      isClaimed: true,
      initials: getInitials(name || 'Golfer'),
      colorIndex: 1,
    })
    await updateDoc(doc(db, 'users', uid), { groups: arrayUnion(foundGroup.id) })
    setStep('done')
    setLoading(false)
  }

  const inp = "w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-green-400"
  const primary = "w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-40"

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="font-display font-extrabold text-2xl text-gray-900 tracking-tight">
            Golf<span className="text-green-600">Group</span> OS
          </h1>
          <p className="text-xs text-gray-400 mt-1">The official history book of your golf group</p>
        </div>

        {/* STEP: Create account */}
        {step === 'account' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Create your account</h2>
            <p className="text-xs text-gray-400 mb-4">Free forever. No credit card needed.</p>

            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors mb-4 disabled:opacity-40"
            >
              <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">G</span>
              Sign up with Google
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-300 tracking-wider">OR</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <form onSubmit={handleEmailSignUp} className="space-y-3">
              <input className={inp} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
              <input className={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              <input className={inp} type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              <div className="flex gap-2 items-center">
                <input className={clsx(inp, 'max-w-[90px]')} type="number" step="0.1" min="0" max="54" placeholder="14.2" value={handicap} onChange={e => setHandicap(e.target.value)} />
                <p className="text-xs text-gray-400 flex-1">Your handicap index — used for net score calculations</p>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className={primary}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-3">
              Already have an account?{' '}
              <a href="/auth/login" className="text-green-600 font-medium">Sign in</a>
            </p>
          </div>
        )}

        {/* STEP: Create or join */}
        {step === 'group-choice' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Set up your group</h2>
            <p className="text-xs text-gray-400 mb-5">Start a new group or join one your friends already set up</p>
            <div className="space-y-3">
              <button onClick={() => setStep('create-group')} className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 hover:bg-gray-100 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-green-600 font-bold text-lg flex-shrink-0">+</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Create a new group</p>
                  <p className="text-xs text-gray-400">You'll be the admin — invite your crew</p>
                </div>
              </button>
              <button onClick={() => setStep('join-group')} className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 hover:bg-gray-100 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">→</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Join with an invite code</p>
                  <p className="text-xs text-gray-400">Your group admin already set it up</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP: Name the group */}
        {step === 'create-group' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <button onClick={() => setStep('group-choice')} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">← Back</button>
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Name your group</h2>
            <p className="text-xs text-gray-400 mb-4">This becomes the header of your group's record book</p>
            <div className="space-y-3 mb-4">
              <input className={inp} placeholder="The Tuesday Crew" value={groupName} onChange={e => setGroupName(e.target.value)} />
              <input className={inp} placeholder="Home course (optional)" value={homeCourse} onChange={e => setHome(e.target.value)} />
            </div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Default format</p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {FORMATS.map(f => (
                <button key={f.value} onClick={() => setFormat(f.value)}
                  className={clsx('py-2 text-xs font-medium rounded-lg border transition-all',
                    format === f.value ? 'bg-green-50 border-green-300 text-green-800' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                  )}>
                  {f.label}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <button onClick={handleCreateGroup} disabled={!groupName.trim() || loading} className={primary}>
              {loading ? 'Creating group...' : 'Continue'}
            </button>
          </div>
        )}

        {/* STEP: Add members */}
        {step === 'add-members' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Add your crew</h2>
            <p className="text-xs text-gray-400 mb-4">Add names and handicaps now — they'll get an invite link to claim their profile</p>
            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
              {members.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-800 text-xs font-medium flex-shrink-0">{getInitials(m.name)}</div>
                  <span className="flex-1 text-xs font-medium text-gray-700">{m.name}</span>
                  <span className="text-xs text-gray-400 mr-2">Hcp {m.hcp || '—'}</span>
                  <button onClick={() => setMembers(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 text-sm leading-none">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-1">
              <input className={clsx(inp, 'flex-1')} placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newName.trim()) { setMembers(p => [...p, { name: newName.trim(), hcp: newHcp }]); setNewName(''); setNewHcp('') } } }}
              />
              <input className={clsx(inp, 'w-16')} placeholder="HCP" value={newHcp} onChange={e => setNewHcp(e.target.value)} />
              <button
                onClick={() => { if (newName.trim()) { setMembers(p => [...p, { name: newName.trim(), hcp: newHcp }]); setNewName(''); setNewHcp('') } }}
                className="bg-gray-900 text-white rounded-xl px-3 text-sm font-medium hover:opacity-85"
              >Add</button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Press Enter or tap Add after each person</p>
            <button onClick={handleAddMembers} disabled={loading} className={primary}>
              {loading ? 'Saving...' : 'Finish setup'}
            </button>
            <button onClick={() => setStep('done')} className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2 py-1 transition-colors">
              Skip for now — add later
            </button>
          </div>
        )}

        {/* STEP: Join with code */}
        {step === 'join-group' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <button onClick={() => setStep('group-choice')} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">← Back</button>
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Join a group</h2>
            <p className="text-xs text-gray-400 mb-4">Enter the invite code your group admin shared with you</p>
            <input
              className={clsx(inp, 'text-center text-xl font-mono font-bold tracking-widest mb-3')}
              placeholder="TUE-447"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
            />
            {foundGroup && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm flex-shrink-0">✓</div>
                <div>
                  <p className="text-sm font-medium text-green-800">{foundGroup.name}</p>
                  <p className="text-xs text-green-600">Group found — tap below to join</p>
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            {!foundGroup
              ? <button onClick={handleLookup} disabled={!joinCode.trim() || loading} className={primary}>
                  {loading ? 'Looking up...' : 'Look up group'}
                </button>
              : <button onClick={handleJoin} disabled={loading} className={primary}>
                  {loading ? 'Joining...' : `Join ${foundGroup.name}`}
                </button>
            }
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-400 flex items-center justify-center mx-auto mb-4 text-2xl text-green-600">✓</div>
            <h2 className="font-display font-bold text-xl text-gray-900 mb-2">The clubhouse is open</h2>
            <p className="text-xs text-gray-400 mb-5">Share your invite code with your group so they can join.</p>
            <button onClick={() => router.replace('/dashboard')} className={primary}>
              Enter the clubhouse →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-green-600 border-t-transparent animate-spin" /></div>}>
      <OnboardingInner />
    </Suspense>
  )
}
