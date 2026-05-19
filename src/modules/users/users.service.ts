import { prisma } from "../../config/prisma"
import { hashPassword } from "../../providers/hash"

export class UsersService {
  private normalizeCpf(cpf: string) {
    return String(cpf || "").replace(/\D/g, "")
  }

  async list() {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        role: true,
        createdAt: true
      },
      orderBy: [
        { role: "asc" },
        { name: "asc" }
      ]
    })

    const voteCounts = await prisma.vote.groupBy({
      by: ["userId"],
      _count: { userId: true },
      where: {
        userId: { in: users.map(user => user.id) }
      }
    })

    const voteCountByUserId = new Map(
      voteCounts.map(voteCount => [voteCount.userId, voteCount._count.userId])
    )

    return users.map(user => {
      const voteCount = voteCountByUserId.get(user.id) || 0

      return {
        ...user,
        voteCount,
        hasVoted: voteCount > 0,
        canChangePassword: user.role !== "ADMIN" && voteCount === 0
      }
    })
  }

  async deactivate(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { active: false }
    })
  }

  async create(data: {
    name: string
    email: string
    cpf: string
    password: string
  }) {
    const name = String(data.name || "").trim()
    const email = String(data.email || "").trim().toLowerCase()
    const cpf = this.normalizeCpf(data.cpf)
    const password = String(data.password || "")

    if (!name) throw new Error("Informe o nome")
    if (!email.includes("@")) throw new Error("Informe um email válido")
    if (cpf.length !== 11) throw new Error("Informe um CPF válido")
    if (password.length < 5) throw new Error("A senha deve ter no mínimo 5 caracteres")

    const existingByEmail = await prisma.user.findUnique({ where: { email } })
    if (existingByEmail) throw new Error("Já existe usuário com este email")

    const existingByCpf = await prisma.user.findUnique({ where: { cpf } })
    if (existingByCpf) throw new Error("Já existe usuário com este CPF")

    const passwordHash = await hashPassword(password)

    return prisma.user.create({
      data: {
        name,
        email,
        cpf,
        passwordHash,
        role: "VOTER",
        active: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        role: true,
        createdAt: true
      }
    })
  }

  async updatePassword(userId: string, password: string) {
    if (!password || password.length < 5) {
      throw new Error("A senha deve ter no mínimo 5 caracteres")
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, active: true }
    })

    if (!user || !user.active) throw new Error("Usuário não encontrado")
    if (user.role === "ADMIN") throw new Error("Não é permitido alterar senha de usuário ADMIN por esta tela")

    const voteCount = await prisma.vote.count({ where: { userId } })
    if (voteCount > 0) throw new Error("Não é possível alterar a senha de usuário que já votou")

    const passwordHash = await hashPassword(password)

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    })

    return { success: true }
  }
}
