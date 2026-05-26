'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('uid') ? 'group-choice' : 'account')
  const [uid, setUid] = useState(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('uid') ?? '' : '')
  const [groupId, setGroupId]     = useState('')
  const [inviteCode, setCode]     = useState('')

  // Account fields
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [handicap, setHandicap]   = useState('')

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

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const user = await signUpWithEmail(email, password, name, parseFloat(handicap) || 18)
      setUid(user.uid)
      setStep('group-choice')
    } catch {
      setError('Could not create account. Email may already be in use.')
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
          displayName: name,
          handicap: parseFloat(handicap) || 18,
          isAdmin: true,
          isClaimed: true,
          initials: getInitials(name),
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
      setError('Could not create group.')
    }
    setLoading(false)
  }

  async function handleAddMembers() {
    // Add ghost members to the group
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
      displayName: name,
      handicap: parseFloat(handicap) || 18,
      isAdmin: false,
      isClaimed: true,
      initials: getInitials(name),
      colorIndex: 1,
    })
    await updateDoc(doc(db, 'users', uid), { groups: arrayUnion(foundGroup.id) })
    setGroupId(foundGroup.id)
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
        </div>

        {/* STEP: Account */}
        {step === 'account' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Create your profile</h2>
            <p className="text-[12px] text-gray-400 mb-4">Your stats follow you across every group</p>
            <form onSubmit={handleAccount} className="space-y-3">
              <input className={inp} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
              <input className={inp} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              <input className={inp} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              <div className="flex gap-2 items-center">
                <input className={clsx(inp, 'max-w-[90px]')} type="number" step="0.1" placeholder="14.2" value={handicap} onChange={e => setHandicap(e.target.value)} />
                <p className="text-[11px] text-gray-400 flex-1">Handicap index — used for net scores</p>
              </div>
              {error && <p className="text-[11px] text-red-500">{error}</p>}
              <button type="submit" disabled={loading} className={primary}>{loading ? 'Creating...' : 'Create account'}</button>
            </form>
            <p className="text-center text-[11px] text-gray-400 mt-3">
              Have an account? <a href="/auth/login" className="text-green-600 font-medium">Sign in</a>
            </p>
          </div>
        )}

        {/* STEP: Group choice */}
        {step === 'group-choice' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Set up your group</h2>
            <p className="text-[12px] text-gray-400 mb-5">Start fresh or join your crew</p>
            <div className="space-y-3">
              <button onClick={() => setStep('create-group')} className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 hover:bg-gray-100 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-green-600 font-bold text-lg flex-shrink-0">+</div>
                <div><p className="text-sm font-medium text-gray-900">Create a new group</p><p className="text-[11px] text-gray-400">You'll be admin</p></div>
              </button>
              <button onClick={() => setStep('join-group')} className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5 hover:bg-gray-100 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">→</div>
                <div><p className="text-sm font-medium text-gray-900">Join with an invite code</p><p className="text-[11px] text-gray-400">Your group is already set up</p></div>
              </button>
            </div>
          </div>
        )}

        {/* STEP: Create group */}
        {step === 'create-group' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Name your group</h2>
            <p className="text-[12px] text-gray-400 mb-4">This becomes the header of your record book</p>
            <div className="space-y-3 mb-4">
              <input className={inp} placeholder="The Tuesday Crew" value={groupName} onChange={e => setGroupName(e.target.value)} />
              <input className={inp} placeholder="Home course (optional)" value={homeCourse} onChange={e => setHome(e.target.value)} />
            </div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Default format</p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              {FORMATS.map(f => (
                <button key={f.value} onClick={() => setFormat(f.value)} className={clsx('py-2 text-[12px] font-medium rounded-lg border transition-all', format === f.value ? 'bg-green-50 border-green-300 text-green-800' : 'bg-gray-50 border-gray-100 text-gray-600')}>
                  {f.label}
                </button>
              ))}
            </div>
            {error && <p className="text-[11px] text-red-500 mb-2">{error}</p>}
            <button onClick={handleCreateGroup} disabled={!groupName.trim() || loading} className={primary}>{loading ? 'Creating...' : 'Create group'}</button>
          </div>
        )}

        {/* STEP: Add members */}
        {step === 'add-members' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Add your crew</h2>
            <p className="text-[12px] text-gray-400 mb-4">They claim their account via invite link later</p>
            <div className="space-y-2 mb-3">
              {members.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-800 text-[9px] font-medium">{getInitials(m.name)}</div>
                  <span className="flex-1 text-[12px] font-medium text-gray-700">{m.name}</span>
                  <span className="text-[11px] text-gray-400">Hcp {m.hcp || '—'}</span>
                  <button onClick={() => setMembers(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400 text-sm">×</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input className={clsx(inp, 'flex-1')} placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
              <input className={clsx(inp, 'w-16')} placeholder="HCP" value={newHcp} onChange={e => setNewHcp(e.target.value)} />
              <button onClick={() => { if (newName.trim()) { setMembers(p => [...p, { name: newName.trim(), hcp: newHcp }]); setNewName(''); setNewHcp('') } }} className="bg-gray-900 text-white rounded-xl px-3 text-sm font-medium">Add</button>
            </div>
            <button onClick={handleAddMembers} disabled={loading} className={primary}>{loading ? 'Saving...' : 'Finish setup'}</button>
            <button onClick={() => setStep('done')} className="w-full text-[12px] text-gray-400 mt-2 py-1">Skip — add later</button>
          </div>
        )}

        {/* STEP: Join */}
        {step === 'join-group' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <h2 className="font-display font-bold text-lg text-gray-900 mb-1">Join a group</h2>
            <p className="text-[12px] text-gray-400 mb-4">Enter the invite code your admin shared</p>
            <input className={clsx(inp, 'text-center text-xl font-mono font-bold tracking-widest mb-3')} placeholder="TUE-447" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
            {foundGroup && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">✓</div>
                <div><p className="text-sm font-medium text-green-800">{foundGroup.name}</p></div>
              </div>
            )}
            {error && <p className="text-[11px] text-red-500 mb-2">{error}</p>}
            {!foundGroup
              ? <button onClick={handleLookup} disabled={!joinCode.trim() || loading} className={primary}>{loading ? 'Looking up...' : 'Look up group'}</button>
              : <button onClick={handleJoin} disabled={loading} className={primary}>{loading ? 'Joining...' : `Join ${foundGroup.name}`}</button>
            }
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-400 flex items-center justify-center mx-auto mb-4 text-2xl text-green-600">✓</div>
            <h2 className="font-display font-bold text-xl text-gray-900 mb-2">The clubhouse is open</h2>
            <p className="text-[12px] text-gray-400 mb-5">Share the code and let the arguments begin.</p>
            {inviteCode && (
              <div className="bg-gray-900 rounded-xl p-4 mb-4 text-left">
                <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Invite code</p>
                <p className="font-mono font-bold text-2xl tracking-widest text-white mb-1">{inviteCode}</p>
                <p className="text-[11px] text-gray-500">Anyone with this code can join</p>
              </div>
            )}
            <button onClick={() => router.replace('/dashboard')} className={primary}>Enter the clubhouse</button>
          </div>
        )}
      </div>
    </div>
  )
}
