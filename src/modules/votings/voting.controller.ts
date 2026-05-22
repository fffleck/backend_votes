import { Request, Response } from "express"
import { VotingService } from "./voting.service"

const service = new VotingService()

export class VotingController {

  async create(req: Request, res: Response) {
    try {

      const { title, description, startDate, endDate } = req.body

      const userId = (req as any).user.userId

      const voting = await service.create({
        title,
        description,
        createdBy: userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      })

      return res.json(voting)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async list(req: Request, res: Response) {
    // @ts-ignore
    const role = req.user?.role || "VOTER"
    const votings = await service.list(role)
    return res.json(votings)
  }

  async findById(req: Request, res: Response) {
    try {

      const id = req.params.id as string
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Invalid ID" })
      }


      const voting = await service.findById(id)

      return res.json(voting)

    } catch (err: any) {
      return res.status(404).json({ error: err.message })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Invalid ID" })
      }

      const { title, description, status, startDate, endDate } = req.body

      const voting = await service.update(id, {
        title,
        description,
        status,
        startDate: startDate ? new Date(startDate) : startDate === null ? null : undefined,
        endDate: endDate ? new Date(endDate) : endDate === null ? null : undefined
      })

      return res.json(voting)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async open(req: Request, res: Response) {
    try {

      const id = req.params.id as string
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Invalid ID" })
      }


      const voting = await service.open(id)

      return res.json(voting)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async close(req: Request, res: Response) {
    try {

      const id = req.params.id as string
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Invalid ID" })
      }

      const voting = await service.close(id)

      return res.json(voting)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async finalize(req: Request, res: Response) {
    try {
      const id = req.params.id as string
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Invalid ID" })
      }

      if ((req as any).user?.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admin users can finalize votings" })
      }

      const voting = await service.finalize(id)

      return res.json(voting)

    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }
}
