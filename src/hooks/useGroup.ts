'use client'
import { useState, useEffect } from 'react'
import { getGroup, getGroupRounds, getRivalries } from '@/lib/db'
import type { Group, Round, Rivalry } from '@/types'

export function useGroup(groupId: string | null) {
  const [group, setGroup]       = useState<Group | null>(null)
  const [rounds, setRounds]     = useState<Round[]>([])
  const [rivalries, setRivalries] = useState<Rivalry[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!groupId) { setLoading(false); return }

    async function load() {
      setLoading(true)
      const [g, r, riv] = await Promise.all([
        getGroup(groupId!),
        getGroupRounds(groupId!),
        getRivalries(groupId!),
      ])
      setGroup(g)
      setRounds(r)
      setRivalries(riv)
      setLoading(false)
    }

    load()
  }, [groupId])

  return { group, rounds, rivalries, loading }
}
