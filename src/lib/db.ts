import {
  doc, getDoc, setDoc, addDoc, updateDoc,
  collection, query, where, orderBy, limit,
  getDocs, serverTimestamp, increment, writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Group, Round, Rivalry, PlayerStats, GroupMember, Award } from '@/types'

// ─── GROUPS ──────────────────────────────────────────────────────────────────

export async function createGroup(
  data: Omit<Group, 'id' | 'createdAt' | 'inviteCode'>
): Promise<string> {
  const inviteCode = generateInviteCode(data.name)
  const ref = doc(collection(db, 'groups'))
  await setDoc(ref, { ...data, inviteCode, createdAt: serverTimestamp() })
  return ref.id
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Group
}

export async function getGroupByInviteCode(code: string): Promise<Group | null> {
  const q = query(collection(db, 'groups'), where('inviteCode', '==', code.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Group
}

export async function addMemberToGroup(groupId: string, member: GroupMember) {
  const ref = doc(db, 'groups', groupId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Group not found')
  const members: GroupMember[] = snap.data().members ?? []
  members.push(member)
  await updateDoc(ref, { members })
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const q = query(collection(db, 'groups'), where('members', 'array-contains', userId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Group)
}

// ─── ROUNDS ──────────────────────────────────────────────────────────────────

export async function createRound(data: Omit<Round, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'rounds'), {
    ...data,
    date: Timestamp.fromDate(data.date),
    createdAt: serverTimestamp(),
  })
  await updateRivalriesFromRound({ id: ref.id, ...data } as Round)
  return ref.id
}

export async function getGroupRounds(groupId: string, limitN = 20): Promise<Round[]> {
  const q = query(
    collection(db, 'rounds'),
    where('groupId', '==', groupId),
    orderBy('date', 'desc'),
    limit(limitN)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    date: (d.data().date as Timestamp).toDate(),
    createdAt: (d.data().createdAt as Timestamp)?.toDate(),
  }) as Round)
}

export async function updateRoundRecap(roundId: string, recapText: string) {
  await updateDoc(doc(db, 'rounds', roundId), { recapText })
}

// ─── RIVALRIES ───────────────────────────────────────────────────────────────

export function rivalryId(groupId: string, a: string, b: string): string {
  const [lo, hi] = [a, b].sort()
  return `${groupId}_${lo}_${hi}`
}

export async function getRivalries(groupId: string): Promise<Rivalry[]> {
  const q = query(collection(db, 'rivalries'), where('groupId', '==', groupId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Rivalry)
}

export async function updateRivalriesFromRound(round: Round) {
  const batch = writeBatch(db)
  const players = round.playerScores.map(p => p.userId)

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const id = rivalryId(round.groupId, players[i], players[j])
      const ref = doc(db, 'rivalries', id)
      const snap = await getDoc(ref)

      const winnerId = round.winnerId
      const aWon = winnerId === players[i]
      const bWon = winnerId === players[j]

      if (!snap.exists()) {
        batch.set(ref, {
          groupId: round.groupId,
          playerIds: [players[i], players[j]].sort(),
          record: {
            [players[i]]: { wins: aWon ? 1 : 0, losses: bWon ? 1 : 0, ties: (!aWon && !bWon) ? 1 : 0 },
            [players[j]]: { wins: bWon ? 1 : 0, losses: aWon ? 1 : 0, ties: (!aWon && !bWon) ? 1 : 0 },
          },
          totalRounds: 1,
          lastPlayed: Timestamp.fromDate(round.date),
          avgMargin: 0,
          currentStreak: winnerId ? { playerId: winnerId, count: 1 } : null,
          longestStreak: winnerId ? { playerId: winnerId, count: 1 } : { playerId: players[i], count: 0 },
        })
      } else {
        const updates: Record<string, unknown> = {
          totalRounds: increment(1),
          lastPlayed: Timestamp.fromDate(round.date),
        }
        if (aWon) updates[`record.${players[i]}.wins`] = increment(1)
        else if (bWon) updates[`record.${players[i]}.losses`] = increment(1)
        else updates[`record.${players[i]}.ties`] = increment(1)

        if (bWon) updates[`record.${players[j]}.wins`] = increment(1)
        else if (aWon) updates[`record.${players[j]}.losses`] = increment(1)
        else updates[`record.${players[j]}.ties`] = increment(1)

        batch.update(ref, updates)
      }
    }
  }
  await batch.commit()
}

// ─── PLAYER STATS ────────────────────────────────────────────────────────────

export async function getPlayerStats(groupId: string, userId: string): Promise<PlayerStats | null> {
  const snap = await getDoc(doc(db, 'player_stats', `${groupId}_${userId}`))
  if (!snap.exists()) return null
  return snap.data() as PlayerStats
}

export async function getGroupStats(groupId: string): Promise<PlayerStats[]> {
  const q = query(collection(db, 'player_stats'), where('groupId', '==', groupId))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data() as PlayerStats)
}

// ─── AWARDS ──────────────────────────────────────────────────────────────────

export async function getGroupAwards(groupId: string, season: number): Promise<Award[]> {
  const q = query(
    collection(db, 'awards'),
    where('groupId', '==', groupId),
    where('season', '==', season)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Award)
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateInviteCode(groupName: string): string {
  const prefix = groupName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X')
  const suffix = Math.floor(100 + Math.random() * 900).toString()
  return `${prefix}-${suffix}`
}

export function netScore(gross: number, handicap: number): number {
  return Math.round(gross - handicap)
}

export function calcPoints(guessesUsed: number, solved: boolean): number {
  if (!solved) return 0
  const map = [1000, 800, 600, 400, 200, 100]
  return map[Math.min(guessesUsed - 1, map.length - 1)] ?? 0
}
