import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export function authMiddleware(req: Request, res: Response, next: NextFunction) {

  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Token missing" })
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET!)

    ;(req as any).user = decoded

    next()

  } catch {
    return res.status(401).json({ error: "Invalid token" })
  }
}