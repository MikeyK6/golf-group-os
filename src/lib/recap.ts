import Anthropic from '@anthropic-ai/sdk'
import type { Round, Group } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateRoundRecap(round: Round, group: Group): Promise<string> {
  const memberMap = Object.fromEntries(group.members.map(m => [m.userId, m.displayName]))

  const scores = round.playerScores
    .sort((a, b) => a.net - b.net)
    .map(p => `${memberMap[p.userId] ?? p.userId}: gross ${p.gross}, net ${p.net} (hcp ${p.handicapUsed})`)
    .join('\n')

  const winner = round.winnerId ? memberMap[round.winnerId] : 'No winner recorded'
  const skinsInfo = round.skins
    ? Object.entries(round.skins.results)
        .map(([uid, count]) => `${memberMap[uid] ?? uid}: ${count} skins`)
        .join(', ')
    : null

  const prompt = `You are writing a short, punchy round recap for a golf group app called Golf Group OS.
The recap should feel like a beat reporter covering a friend group — specific, funny, and slightly savage.
Name names. Reference the margin. Call out anyone who choked or had a moment.
Keep it to 3-4 sentences. Do not use bullet points. Do not start with "In a..."

Round details:
Course: ${round.courseName}
Date: ${round.date.toLocaleDateString()}
Format: ${round.format}
Winner: ${winner}
${skinsInfo ? `Skins: ${skinsInfo}` : ''}

Scores:
${scores}

${round.nassau ? `Nassau bet ($${round.nassau.valuePerSide}/side):
  Front: ${memberMap[round.nassau.frontWinnerId ?? ''] ?? 'Push'}
  Back: ${memberMap[round.nassau.backWinnerId ?? ''] ?? 'Push'}` : ''}

Write the recap now:`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  return block.type === 'text' ? block.text.trim() : 'Round recap unavailable.'
}
