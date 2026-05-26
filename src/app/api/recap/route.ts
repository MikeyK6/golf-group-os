import { NextRequest, NextResponse } from 'next/server'
import { generateRoundRecap } from '@/lib/recap'
import { getGroup } from '@/lib/db'
import { updateRoundRecap } from '@/lib/db'
import type { Round } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { round, groupId, roundId } = await req.json() as {
      round: Round
      groupId: string
      roundId: string
    }

    const group = await getGroup(groupId)
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    const recap = await generateRoundRecap(round, group)

    // Persist the recap back to Firestore
    await updateRoundRecap(roundId, recap)

    return NextResponse.json({ recap })
  } catch (err) {
    console.error('Recap generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate recap' }, { status: 500 })
  }
}
