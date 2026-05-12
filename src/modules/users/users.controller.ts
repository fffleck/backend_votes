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

  async deactivate(req: AuthRequest, res: Response) {
    if (!ensureAdmin(req, res)) return
    let { userId } = req.params
    if (Array.isArray(userId)) userId = userId[0]
    await service.deactivate(userId.toString())
    return res.json({ success: true })
  }

  async listPreRegistered(req: AuthRequest, res: Response) {
    if (!ensureAdmin(req, res)) return
    const users = await service.listPreRegistered()
    return res.json(users)
  }

  async createPreRegistered(req: AuthRequest, res: Response) {
    try {
      if (!ensureAdmin(req, res)) return
      const { name, email, cpf, status } = req.body
      const user = await service.createPreRegistered({ name, email, cpf, status })
      return res.json(user)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }

  async updatePreRegistered(req: AuthRequest, res: Response) {
    try {
      if (!ensureAdmin(req, res)) return
      let { id } = req.params
      if (Array.isArray(id)) id = id[0]
      const { name, email, cpf, status } = req.body
      const user = await service.updatePreRegistered(id.toString(), { name, email, cpf, status })
      return res.json(user)
    } catch (err: any) {
      return res.status(400).json({ error: err.message })
    }
  }
}
