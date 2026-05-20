import { Request, Response } from "express"
import { VoteService } from "./vote.service"

const service = new VoteService()

export class VoteController {

  async vote(req: Request, res: Response) {
    try {

      const userId = (req as any).user.userId
      const { votingId, answers } = req.body

      const vote = await service.vote(userId, votingId, answers)

      return res.json(vote)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async myVotes(req: Request, res: Response) {
    const userId = (req as any).user.userId
    const result = await service.myVotes(userId)
    return res.json(result)
  }

  async myLatestVote(req: Request, res: Response) {
    const userId = (req as any).user.userId
    const vote = await service.myLatestVote(userId)
    return res.json({ vote })
  }

  async results(req: Request, res: Response) {

    const votingId = req.params.votingId as string

    const result = await service.results(votingId)

    return res.json(result)
  }
}
