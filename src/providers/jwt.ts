import * as jwt from "jsonwebtoken"

import { prisma } from "../config/prisma"

export const generateToken = async (userId: string) => {
  // Busca o usuário para pegar o role
  const user = await prisma.user.findUnique({ where: { id: userId } })
  return jwt.sign(
    { userId, role: user?.role || "VOTER" },
    process.env.JWT_SECRET as string,
    { expiresIn: "1d" }
  )
}