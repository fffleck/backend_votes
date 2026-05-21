import { Request, Response } from "express"
type AuthRequest = Request & { user?: any }
import { UsersService } from "./users.service"

const service = new UsersService()

function ensureAdmin(req: AuthRequest, res: Response) {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ error: "Acesso negado" })
    return false
  }
  return true
}

export class UsersController {
  async list(req: AuthRequest, res: Response) {
    if (!ensureAdmin(req, res)) return
    const users = await service.list()
    return res.json(users)
  }

  async create(req: AuthRequest, res: Response) {
    try {
      if (!ensureAdmin(req, res)) return
      const { name, email, cpf, password } = req.body
      const user = await service.create({ name, email, cpf, password })
      return res.json(user)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async deactivate(req: AuthRequest, res: Response) {
    if (!ensureAdmin(req, res)) return
    let { userId } = req.params
    if (Array.isArray(userId)) userId = userId[0]
    await service.deactivate(userId.toString())
    return res.json({ success: true })
  }

  async updatePassword(req: AuthRequest, res: Response) {
    try {
      if (!ensureAdmin(req, res)) return
      let { userId } = req.params
      if (Array.isArray(userId)) userId = userId[0]
      const { password } = req.body
      const result = await service.updatePassword(userId.toString(), password)
      return res.json(result)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async sendInvitation(req: AuthRequest, res: Response) {
    try {
      if (!ensureAdmin(req, res)) return
      let { userId } = req.params
      if (Array.isArray(userId)) userId = userId[0]
      const result = await service.sendInvitation(userId.toString())
      return res.json(result)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async sendInvitationsToAllVoters(req: AuthRequest, res: Response) {
    try {
      if (!ensureAdmin(req, res)) return
      const result = service.startInvitationBatch()
      return res.json(result)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }
}
