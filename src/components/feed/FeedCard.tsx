'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Avatar, AvatarStack } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import type { Round, Group } from '@/types'
import clsx from 'clsx'

const FORMAT_LABELS: Record<string, string> = {
  stroke: 'Stroke', match: 'Match', skins: 'Skins', nassau: 'Nassau', ryder_cup: 'Ryder Cup',
}
const FORMAT_VARIANTS: Record<string, 'stroke' | 'match' | 'skins' | 'nassau'> = {
  stroke: 'stroke', match: 'match', skins: 'skins', nassau: 'nassau', ryder_cup: 'match',
}

interface FeedCardProps {
  round: Round
  group: Group
}

export function FeedCard({ round, group }: FeedCardProps) {
  const [copied, setCopied] = useState(false)

  const memberMap = Object.fromEntries(group.members.map(m => [m.userId, m]))
  const sorted = [...round.playerScores].sort((a, b) => a.net - b.net)

  const avatarItems = round.playerScores.map(p => ({
    initials: memberMap[p.userId]?.initials ?? '??',
    colorIndex: memberMap[p.userId]?.colorIndex ?? 0,
  }))

  function handleShare() {
    const text = [
      `Golf Group OS · ${round.courseName}`,
      `${format(round.date, 'MMM d, yyyy')}`,
      '',
      sorted.map(p => `${memberMap[p.userId]?.displayName ?? p.userId}: Net ${p.net}`).join('\n'),
      '',
      round.recapText ?? '',
    ].join('\n').trim()

    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 mb-2.5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <AvatarStack items={avatarItems} />
          <p className="font-display font-bold text-[13px] text-gray-900 mt-1.5">{round.courseName}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{format(round.date, 'MMM d, yyyy')}</p>
        </div>
        <Badge variant={FORMAT_VARIANTS[round.format] ?? 'muted'}>
          {FORMAT_LABELS[round.format] ?? round.format}
        </Badge>
      </div>

      {round.recapText && (
        <div className="text-[12px] text-gray-600 leading-relaxed px-2.5 py-2 bg-gray-50 rounded border-l-2 border-green-200 mb-2">
          "{round.recapText}"
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {sorted.map(p => (
          <div
            key={p.userId}
            className={clsx(
              'text-[11px] px-2 py-1 rounded border',
              p.userId === round.winnerId
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-gray-50 border-gray-100 text-gray-500'
            )}
          >
            <span className="font-medium">{memberMap[p.userId]?.displayName ?? p.userId}</span>
            {' · Net '}{p.net}
            {p.userId === round.winnerId && ' · W'}
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={handleShare}
          className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded px-2 py-1 flex items-center gap-1 hover:bg-gray-100 transition-colors"
        >
          {copied ? '✓ Copied' : '↗ Share recap'}
        </button>
        <button className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded px-2 py-1 hover:bg-gray-100 transition-colors">
          Trash talk
        </button>
        <button className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded px-2 py-1 hover:bg-gray-100 transition-colors">
          Scorecard
        </button>
      </div>
    </div>
  )
}
