export type UserId = string
export type GroupId = string
export type RoundId = string
export type CourseId = string

export interface User {
  id: UserId
  displayName: string
  email: string
  photoURL?: string
  handicap: number
  groups: GroupId[]
  createdAt: Date
}

export interface GroupMember {
  userId: UserId
  displayName: string
  handicap: number
  isAdmin: boolean
  isClaimed: boolean  // false = admin created them, haven't signed up yet
  initials: string
  colorIndex: number  // 0-3 for avatar color cycling
}

export interface Group {
  id: GroupId
  name: string
  inviteCode: string
  createdBy: UserId
  createdAt: Date
  members: GroupMember[]
  homeCourse?: string
  seasonStart: number   // month 1-12
  defaultFormat: RoundFormat
  ryderCup?: {
    teamA: { name: string; memberIds: UserId[] }
    teamB: { name: string; memberIds: UserId[] }
  }
}

export type RoundFormat = 'stroke' | 'match' | 'skins' | 'nassau' | 'ryder_cup'

export interface PlayerScore {
  userId: UserId
  gross: number
  net: number
  handicapUsed: number
  holeScores?: number[]  // optional hole-by-hole
  skinsWon?: number
  moneyWon?: number
}

export interface Round {
  id: RoundId
  groupId: GroupId
  courseId?: CourseId
  courseName: string
  date: Date
  format: RoundFormat
  playerScores: PlayerScore[]
  winnerId?: UserId       // net winner for stroke play
  grossWinnerId?: UserId
  nassau?: {
    valuePerSide: number
    frontWinnerId?: UserId
    backWinnerId?: UserId
    overallWinnerId?: UserId
  }
  skins?: {
    valuePerSkin: number
    results: Record<UserId, number>  // skins count per player
  }
  recapText?: string      // AI-generated
  eventId?: string        // links to trip or ryder cup
  createdBy: UserId
  createdAt: Date
}

export interface Rivalry {
  id: string   // `{groupId}_{userId1}_{userId2}` — lower id first
  groupId: GroupId
  playerIds: [UserId, UserId]
  record: {
    [userId: string]: { wins: number; losses: number; ties: number }
  }
  currentStreak: { playerId: UserId; count: number } | null
  longestStreak: { playerId: UserId; count: number }
  lastPlayed: Date
  totalRounds: number
  avgMargin: number
}

export interface PlayerStats {
  groupId: GroupId
  userId: UserId
  allTime: {
    rounds: number
    wins: number
    losses: number
    winPct: number
    netAvg: number
    grossAvg: number
    birdies: number
    skinsWon: number
    moneyWon: number
    longestWinStreak: number
    bestRound: number
  }
  byCourse: Record<CourseId, { rounds: number; wins: number; netAvg: number; courseName: string }>
  bySeason: Record<number, { wins: number; losses: number; points: number }>
  lastUpdated: Date
}

export interface Award {
  id: string
  groupId: GroupId
  userId: UserId
  key: string
  label: string
  description: string
  season: number
  supportingStat: string
}

export type EventType = 'trip' | 'ryder_cup' | 'season' | 'major' | 'playoff'

export interface GroupEvent {
  id: string
  groupId: GroupId
  type: EventType
  name: string
  startDate: Date
  endDate?: Date
  playerIds: UserId[]
  roundIds: RoundId[]
  winnerId?: UserId
  recap?: string
  ryderCupScore?: { teamA: number; teamB: number; winner?: 'teamA' | 'teamB' }
}

// UI helper for avatar colors
export const AVATAR_COLORS = [
  { bg: '#EAF3DE', text: '#27500A' },  // green
  { bg: '#E6F1FB', text: '#0C447C' },  // blue
  { bg: '#FAEEDA', text: '#633806' },  // amber
  { bg: '#FCEBEB', text: '#791F1F' },  // red
] as const
