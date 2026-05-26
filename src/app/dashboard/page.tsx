'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { getGroupRounds, getRivalries } from '@/lib/db'
import { FeedCard } from '@/components/feed/FeedCard'
import { LogRound } from '@/components/log/LogRound'
import { signOut } from '@/lib/auth'
import type { Group, Round, Rivalry, User } from '@/types'
import clsx from 'clsx'

type Tab = 'feed' | 'rivals' | 'stats' | 'events' | 'history' | 'log'

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'feed',    label: 'Feed',    icon: '⊞' },
  { id: 'rivals',  label: 'Rivals',  icon: '⚔' },
  { id: 'stats',   label: 'Stats',   icon: '↗' },
  { id: 'events',  label: 'Events',  icon: '⬡' },
  { id: 'history', label: 'History', icon: '◎' },
]

export default function Dashboard() {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('feed')
  const [user, setUser]         = useState<any>(null)
  const [group, setGroup]       = useState<Group | null>(null)
  const [rounds, setRounds]     = useState<Round[]>([])
  const [rivalries, setRivalries] = useState<Rivalry[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.replace('/auth/login')
        return
      }

      setUser(firebaseUser)

      try {
        // Load user doc
        const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (!userSnap.exists()) {
          router.replace('/auth/onboarding')
          return
        }

        const userData = userSnap.data()
        const groups: string[] = userData.groups ?? []

        if (groups.length === 0) {
          router.replace('/auth/onboarding?uid=' + firebaseUser.uid)
          return
        }

        // Load first group
        const groupSnap = await getDoc(doc(db, 'groups', groups[0]))
        if (!groupSnap.exists()) {
          router.replace('/auth/onboarding?uid=' + firebaseUser.uid)
          return
        }

        const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group
        setGroup(groupData)

        // Load rounds and rivalries in parallel
        const [r, riv] = await Promise.all([
          getGroupRounds(groups[0], 20),
          getRivalries(groups[0]),
        ])
        setRounds(r)
        setRivalries(riv)
      } catch (err) {
        console.error('Dashboard load error:', err)
        setError('Something went wrong loading your group. Try refreshing.')
      } finally {
        setLoading(false)
      }
    })

    return unsub
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Loading your clubhouse...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-gray-500 text-center">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-green-600 font-medium">Refresh</button>
        <button onClick={signOut} className="text-sm text-gray-400">Sign out</button>
      </div>
    )
  }

  if (!group) return null

  const memberMap = Object.fromEntries((group.members ?? []).map(m => [m.userId, m]))
  const avColors = ['#EAF3DE','#E6F1FB','#FAEEDA','#FCEBEB']
  const avText   = ['#27500A','#0C447C','#633806','#791F1F']

  function Av({ uid, size = 7 }: { uid: string; size?: number }) {
    const m = memberMap[uid]
    const ci = m?.colorIndex ?? 0
    return (
      <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0`}
        style={{ background: avColors[ci % 4], color: avText[ci % 4] }}>
        {m?.initials ?? '??'}
      </div>
    )
  }

  function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2 mt-4 first:mt-0">{children}</p>
  }

  // ── FEED ──────────────────────────────────────────────────────────────────
  function FeedTab() {
    const sorted = [...(group?.members ?? [])].sort((a, b) => {
      const aW = rounds.filter(r => r.winnerId === a.userId).length
      const bW = rounds.filter(r => r.winnerId === b.userId).length
      return bW - aW
    })

    return (
      <div>
        <SectionLabel>Season standings · 2025</SectionLabel>
        <div className="bg-white border border-gray-100 rounded-xl px-3 py-1 mb-3">
          {sorted.map((m, i) => {
            const wins   = rounds.filter(r => r.winnerId === m.userId).length
            const played = rounds.filter(r => r.playerScores?.some(p => p.userId === m.userId)).length
            return (
              <div key={m.userId} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <span className={clsx('text-[11px] font-mono min-w-[16px] text-center', i === 0 ? 'text-green-600 font-medium' : 'text-gray-300')}>{i + 1}</span>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                  style={{ background: avColors[m.colorIndex % 4], color: avText[m.colorIndex % 4] }}>
                  {m.initials}
                </div>
                <span className="flex-1 text-[12px] font-medium text-gray-900">{m.displayName}</span>
                <span className="text-[11px] text-gray-400 font-mono">{wins}–{played - wins}</span>
              </div>
            )
          })}
          {(group?.members ?? []).length === 0 && (
            <p className="text-xs text-gray-400 py-3 text-center">No members yet</p>
          )}
        </div>

        <SectionLabel>Recent rounds</SectionLabel>
        {rounds.length === 0
          ? <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl mb-3">No rounds yet — log your first one!</div>
          : rounds.map(r => <FeedCard key={r.id} round={r} group={group!} />)
        }
        <button onClick={() => setTab('log')}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium mt-1 hover:opacity-85 transition-opacity">
          + Log a round
        </button>
      </div>
    )
  }

  // ── RIVALS ────────────────────────────────────────────────────────────────
  function RivalsTab() {
    if (rivalries.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          Log some rounds to start building rivalries
        </div>
      )
    }
    return (
      <div>
        <SectionLabel>Head-to-head records</SectionLabel>
        {[...rivalries].sort((a, b) => b.totalRounds - a.totalRounds).map(riv => {
          const [aId, bId] = riv.playerIds
          const ma = memberMap[aId]
          const mb = memberMap[bId]
          if (!ma || !mb) return null
          const ra = riv.record?.[aId] ?? { wins: 0, losses: 0, ties: 0 }
          const rb = riv.record?.[bId] ?? { wins: 0, losses: 0, ties: 0 }
          const total = ra.wins + rb.wins + (ra.ties ?? 0)
          const aPct = total > 0 ? (ra.wins / total) * 100 : 50
          const leader = ra.wins >= rb.wins ? ma : mb
          const leaderW = ra.wins >= rb.wins ? ra.wins : rb.wins
          const otherW  = ra.wins >= rb.wins ? rb.wins : ra.wins
          return (
            <div key={riv.id} className="bg-white border border-gray-100 rounded-xl p-3 mb-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium"
                    style={{ background: avColors[ma.colorIndex % 4], color: avText[ma.colorIndex % 4] }}>{ma.initials}</div>
                  <span className="text-[11px] text-gray-400">vs</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium"
                    style={{ background: avColors[mb.colorIndex % 4], color: avText[mb.colorIndex % 4] }}>{mb.initials}</div>
                  <div className="ml-1">
                    <p className="text-[13px] font-medium text-gray-900">{ma.displayName} vs {mb.displayName}</p>
                    <p className="text-[10px] text-gray-400">{riv.totalRounds} rounds</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-mono font-medium text-gray-900">{leaderW}–{otherW}</p>
                  <p className="text-[10px] text-gray-400">{leader.displayName} leads</p>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-green-300 rounded-l-full" style={{ width: `${aPct}%` }} />
                <div className="bg-red-200 flex-1 rounded-r-full" />
              </div>
              {riv.currentStreak && (
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {memberMap[riv.currentStreak.playerId]?.displayName} on a {riv.currentStreak.count}-win streak
                </p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── STATS ─────────────────────────────────────────────────────────────────
  function StatsTab() {
    const me = (group?.members ?? []).find(m => m.userId === user?.uid)
    const myRounds = rounds.filter(r => r.playerScores?.some(p => p.userId === user?.uid))
    const myWins   = myRounds.filter(r => r.winnerId === user?.uid).length
    const myNets   = myRounds.flatMap(r => r.playerScores?.filter(p => p.userId === user?.uid).map(p => p.net) ?? [])
    const avgNet   = myNets.length ? (myNets.reduce((a, b) => a + b, 0) / myNets.length).toFixed(1) : '—'

    return (
      <div>
        {me && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ background: avColors[me.colorIndex % 4], color: avText[me.colorIndex % 4] }}>{me.initials}</div>
            <div>
              <p className="text-sm font-medium text-gray-900">{me.displayName}</p>
              <p className="text-[11px] text-gray-400">Handicap {me.handicap}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { val: `${myWins}–${myRounds.length - myWins}`, lbl: '2025 record' },
            { val: myRounds.length > 0 ? `${Math.round((myWins / myRounds.length) * 100)}%` : '—', lbl: 'Win rate' },
            { val: avgNet, lbl: 'Avg net score' },
            { val: myRounds.length, lbl: 'Rounds played' },
          ].map(s => (
            <div key={s.lbl} className="bg-gray-50 rounded-lg p-3">
              <p className="text-[19px] font-mono font-medium text-gray-900">{s.val}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.lbl}</p>
            </div>
          ))}
        </div>

        <SectionLabel>All members</SectionLabel>
        <div className="bg-white border border-gray-100 rounded-xl px-3 py-1">
          {(group?.members ?? []).map(m => {
            const mw = rounds.filter(r => r.winnerId === m.userId).length
            const mr = rounds.filter(r => r.playerScores?.some(p => p.userId === m.userId)).length
            return (
              <div key={m.userId} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium"
                  style={{ background: avColors[m.colorIndex % 4], color: avText[m.colorIndex % 4] }}>{m.initials}</div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-gray-900">{m.displayName}</p>
                  <p className="text-[10px] text-gray-400">Hcp {m.handicap}</p>
                </div>
                <span className="text-[11px] font-mono text-gray-500">{mw}–{mr - mw}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── EVENTS ────────────────────────────────────────────────────────────────
  function EventsTab() {
    return (
      <div>
        <SectionLabel>Ryder Cup</SectionLabel>
        {group?.ryderCup ? (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-3">
            <p className="text-[13px] font-medium text-gray-900 mb-2">Ryder Cup 2025</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-gray-100 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{group.ryderCup.teamA.name}</p>
                <p className="text-2xl font-mono font-medium text-gray-900">—</p>
              </div>
              <span className="text-[11px] text-gray-400 font-medium">vs</span>
              <div className="flex-1 bg-white border border-gray-100 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{group.ryderCup.teamB.name}</p>
                <p className="text-2xl font-mono font-medium text-gray-900">—</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl mb-3">
            No Ryder Cup set up yet
          </div>
        )}
        <SectionLabel>Golf trips</SectionLabel>
        <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl mb-3">
          No trips planned yet
        </div>
        <button className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-85 transition-opacity">
          + Create event
        </button>
      </div>
    )
  }

  // ── HISTORY ───────────────────────────────────────────────────────────────
  function HistoryTab() {
    const topScorers = [...(group?.members ?? [])]
      .map(m => ({ m, wins: rounds.filter(r => r.winnerId === m.userId).length }))
      .sort((a, b) => b.wins - a.wins)

    return (
      <div>
        <SectionLabel>All-time wins</SectionLabel>
        <div className="bg-white border border-gray-100 rounded-xl px-3 py-1 mb-3">
          {topScorers.map(({ m, wins }, i) => (
            <div key={m.userId} className="flex items-center gap-2.5 py-2 border-b border-gray-50 last:border-0">
              <span className={clsx('text-[11px] font-mono min-w-[16px]', i === 0 ? 'text-green-600 font-medium' : 'text-gray-300')}>{i + 1}</span>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium"
                style={{ background: avColors[m.colorIndex % 4], color: avText[m.colorIndex % 4] }}>{m.initials}</div>
              <span className="flex-1 text-[12px] font-medium text-gray-900">{m.displayName}</span>
              <span className="text-[13px] font-mono font-medium text-gray-900">{wins}</span>
              <span className="text-[10px] text-gray-400">wins</span>
            </div>
          ))}
          {topScorers.length === 0 && <p className="text-xs text-gray-400 py-3 text-center">No rounds logged yet</p>}
        </div>

        <SectionLabel>Group stats</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-400 mb-1">Total rounds</p>
            <p className="text-xl font-mono font-medium text-gray-900">{rounds.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] text-gray-400 mb-1">Members</p>
            <p className="text-xl font-mono font-medium text-gray-900">{(group?.members ?? []).length}</p>
          </div>
        </div>

        <SectionLabel>Invite code</SectionLabel>
        <div className="bg-gray-900 rounded-xl p-4 text-center">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Share with friends</p>
          <p className="font-mono font-bold text-2xl tracking-widest text-white mb-1">{group?.inviteCode ?? '—'}</p>
          <p className="text-[10px] text-gray-500">golf-group-os.vercel.app/auth/onboarding</p>
        </div>
      </div>
    )
  }

  const tabContent: Record<Exclude<Tab, 'log'>, React.ReactNode> = {
    feed: <FeedTab />, rivals: <RivalsTab />, stats: <StatsTab />,
    events: <EventsTab />, history: <HistoryTab />,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <div className="w-full max-w-sm bg-white min-h-screen flex flex-col">

        <div className="px-3.5 py-3 flex items-center justify-between border-b border-gray-100">
          <h1 className="font-display font-extrabold text-[17px] text-gray-900 tracking-tight">
            Golf<span className="text-green-600">Group</span> OS
          </h1>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 cursor-pointer">
              {group?.name ?? 'My Group'} <span className="text-gray-300">▾</span>
            </div>
            <button onClick={signOut} title="Sign out"
              className="w-7 h-7 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs hover:bg-gray-50">
              ↩
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-100">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={clsx('flex-1 py-2.5 text-[10px] flex flex-col items-center gap-0.5 border-b-2 transition-all tracking-wide',
                tab === n.id ? 'text-green-600 border-green-600' : 'text-gray-300 border-transparent hover:text-gray-400'
              )}>
              <span className="text-base leading-none">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-3.5 overflow-auto">
          {tab === 'log'
            ? <LogRound group={group!} userId={user?.uid ?? ''} onSaved={() => setTab('feed')} onCancel={() => setTab('feed')} />
            : tabContent[tab]
          }
        </div>

      </div>
    </div>
  )
}
