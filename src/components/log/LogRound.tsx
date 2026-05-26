'use client'
import { useState } from 'react'
import { createRound, netScore } from '@/lib/db'
import type { Group, RoundFormat, PlayerScore } from '@/types'
import clsx from 'clsx'

const FORMATS: { value: RoundFormat; label: string }[] = [
  { value: 'stroke', label: 'Stroke' },
  { value: 'match',  label: 'Match' },
  { value: 'skins',  label: 'Skins' },
  { value: 'nassau', label: 'Nassau' },
]

interface LogRoundProps {
  group: Group
  userId: string
  onSaved: (roundId: string) => void
  onCancel: () => void
}

export function LogRound({ group, userId, onSaved, onCancel }: LogRoundProps) {
  const [courseName, setCourseName]   = useState('')
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0])
  const [format, setFormat]           = useState<RoundFormat>('stroke')
  const [activePlayers, setActive]    = useState<Set<string>>(new Set(group.members.map(m => m.userId)))
  const [grossScores, setGross]       = useState<Record<string, string>>({})
  const [nassauValue, setNassau]      = useState('')
  const [skinsValue, setSkins]        = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  function togglePlayer(uid: string) {
    setActive(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  async function handleSave() {
    if (!courseName.trim()) { setError('Please enter a course name'); return }
    const playing = group.members.filter(m => activePlayers.has(m.userId))
    if (playing.length < 2) { setError('At least 2 players required'); return }

    const playerScores: PlayerScore[] = playing.map(m => {
      const gross = parseInt(grossScores[m.userId] ?? '0') || 0
      return {
        userId: m.userId,
        gross,
        net: netScore(gross, m.handicap),
        handicapUsed: m.handicap,
      }
    })

    const sorted = [...playerScores].sort((a, b) => a.net - b.net)
    const winnerId = sorted[0]?.userId

    setSaving(true)
    setError('')
    try {
      const roundData = {
        groupId: group.id,
        courseName: courseName.trim(),
        date: new Date(date),
        format,
        playerScores,
        winnerId,
        nassau: nassauValue ? {
          valuePerSide: parseFloat(nassauValue),
          frontWinnerId: undefined,
          backWinnerId: undefined,
          overallWinnerId: undefined,
        } : undefined,
        skins: skinsValue ? {
          valuePerSkin: parseFloat(skinsValue),
          results: Object.fromEntries(playing.map(m => [m.userId, 0])),
        } : undefined,
        createdBy: userId,
      }

      const roundId = await createRound(roundData)

      // Fire and forget recap generation
      fetch('/api/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round: { ...roundData, id: roundId }, groupId: group.id, roundId }),
      })

      onSaved(roundId)
    } catch (e) {
      setError('Something went wrong. Try again.')
      setSaving(false)
    }
  }

  const memberMap = Object.fromEntries(group.members.map(m => [m.userId, m]))

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 cursor-pointer" onClick={onCancel}>
        <span className="text-gray-400 text-sm">← Back</span>
      </div>

      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Log a round</p>

      <div className="bg-white border border-gray-100 rounded-xl p-3.5 mb-2.5">

        <div className="mb-3">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Course</p>
          <input
            value={courseName}
            onChange={e => setCourseName(e.target.value)}
            placeholder="Granite Links GC"
            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-green-400"
          />
        </div>

        <div className="mb-3">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Date</p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-green-400"
          />
        </div>

        <div className="mb-3">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Format</p>
          <div className="grid grid-cols-2 gap-1.5">
            {FORMATS.map(f => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={clsx(
                  'py-2 text-[12px] font-medium rounded-lg border transition-all',
                  format === f.value
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Who played</p>
          <div className="flex flex-wrap gap-1.5">
            {group.members.map(m => (
              <button
                key={m.userId}
                onClick={() => togglePlayer(m.userId)}
                className={clsx(
                  'text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all',
                  activePlayers.has(m.userId)
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : 'bg-gray-50 border-gray-100 text-gray-400'
                )}
              >
                {m.displayName}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Gross scores</p>
          <div className="grid grid-cols-2 gap-2">
            {group.members.filter(m => activePlayers.has(m.userId)).map(m => (
              <div key={m.userId} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium flex-shrink-0"
                  style={{
                    background: ['#EAF3DE','#E6F1FB','#FAEEDA','#FCEBEB'][m.colorIndex % 4],
                    color: ['#27500A','#0C447C','#633806','#791F1F'][m.colorIndex % 4],
                  }}
                >
                  {m.initials}
                </div>
                <span className="text-[11px] text-gray-500 flex-1">{m.displayName.split(' ')[0]}</span>
                <input
                  type="number"
                  placeholder="82"
                  value={grossScores[m.userId] ?? ''}
                  onChange={e => setGross(prev => ({ ...prev, [m.userId]: e.target.value }))}
                  className="w-10 bg-white border border-gray-200 rounded text-center text-[13px] font-mono font-medium text-gray-900 py-1 outline-none focus:border-green-400"
                />
              </div>
            ))}
          </div>
        </div>

        {(format === 'nassau' || format === 'skins') && (
          <div className="mb-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
              {format === 'nassau' ? 'Nassau value ($ per side)' : 'Skins value ($ per skin)'}
            </p>
            <input
              type="number"
              placeholder="5"
              value={format === 'nassau' ? nassauValue : skinsValue}
              onChange={e => format === 'nassau' ? setNassau(e.target.value) : setSkins(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-green-400"
            />
          </div>
        )}

        {error && <p className="text-[11px] text-red-500 mb-2">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-[13px] font-medium disabled:opacity-40 hover:opacity-85 transition-opacity"
        >
          {saving ? 'Saving...' : 'Save round + generate recap'}
        </button>
      </div>
    </div>
  )
}
