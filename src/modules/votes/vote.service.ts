import { prisma } from "../../config/prisma"
import { encrypt, decrypt, hash } from "../../providers/crypto"

export class VoteService {

  async vote(userId: string, votingId: string, answers: any) {

    const voting = await prisma.voting.findUnique({
      where: { id: votingId },
      include: {
        steps: { include: { options: true } }
      }
    })

    if (!voting) throw new Error("Voting not found")

    if (voting.status !== "open") {
      throw new Error("Voting is not open")
    }

    const already = await prisma.vote.findFirst({
      where: { userId, votingId }
    })

    if (already) {
      throw new Error("User already voted")
    }

    for (const step of voting.steps) {

      const selected = answers[step.id]

      if (!selected) {
        throw new Error(`Step ${step.title} is required`)
      }

      if (step.type === "single") {
        if (Array.isArray(selected)) {
          throw new Error("Invalid selection")
        }
      }

      if (step.type === "multiple") {
        if (!Array.isArray(selected)) {
          throw new Error("Invalid selection")
        }

        if (
          selected.length < step.minSelect ||
          selected.length > step.maxSelect
        ) {
          throw new Error("Invalid number of selections")
        }
      }
    }

    const payload = JSON.stringify({
      userId,
      votingId,
      answers,
      timestamp: new Date()
    })

    return prisma.vote.create({
      data: {
        userId,
        votingId,
        encryptedVote: encrypt(payload),
        voteHash: hash(payload)
      }
    })
  }

  async myVotes(userId: string): Promise<string[]> {
    const votes = await prisma.vote.findMany({ where: { userId }, select: { votingId: true } })
    return votes.map(v => v.votingId)
  }

  async results(votingId: string) {

    const votes = await prisma.vote.findMany({
      where: { votingId }
    })

    const parsedVotes = votes.map(v => {
      try {
        const decrypted = JSON.parse(decrypt(v.encryptedVote))
        return {
          answers: decrypted.answers,
          createdAt: v.createdAt
        }
      } catch {
        return null
      }
    }).filter(Boolean)

    const timeline = new Map<string, number>()

    parsedVotes.forEach(vote => {
      const hour = new Date(vote!.createdAt)
      hour.setMinutes(0, 0, 0)
      const key = hour.toISOString()
      timeline.set(key, (timeline.get(key) || 0) + 1)
    })

    return {
      totalVotes: parsedVotes.length,
      votes: parsedVotes.map(vote => vote!.answers),
      voteTimeline: [...timeline.entries()]
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime())
    }
  }
}
