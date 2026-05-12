import { Request, Response } from "express"
import { VotingStepService } from "./votingStep.service"

const service = new VotingStepService()

export class VotingStepController {

  async createStep(req: Request, res: Response) {
    try {

      const { votingId, title, type, minSelect, maxSelect } = req.body

      const step = await service.createStep({
        votingId,
        title,
        type,
        minSelect,
        maxSelect
      })

      return res.json(step)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async addOption(req: Request, res: Response) {
    try {

      const { stepId, label, imageUrl } = req.body

      const option = await service.addOption(stepId, label, imageUrl)

      return res.json(option)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async getSteps(req: Request, res: Response) {

    const votingId = req.params.votingId as string

    const steps = await service.getSteps(votingId)

    return res.json(steps)
  }
  async deleteStep(req: Request, res: Response) {
    try {
      let { stepId } = req.params
      if (Array.isArray(stepId)) stepId = stepId[0]
      await service.deleteStep(stepId.toString())
      return res.json({ success: true })
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async deleteOption(req: Request, res: Response) {
    try {
      let { optionId } = req.params
      if (Array.isArray(optionId)) optionId = optionId[0]
      await service.deleteOption(optionId.toString())
      return res.json({ success: true })
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }
}