import { prisma } from "../../config/prisma"
import { randomUUID } from "crypto"

type PreRegisteredUserRow = {
  id: string
  name: string
  email: string
  cpf: string
  status: "apto" | "inapto"
  createdAt: Date
  updatedAt: Date
}

export class UsersService {
  private normalizeCpf(cpf: string) {
    return String(cpf || "").replace(/\D/g, "")
  }

  async list() {
    return prisma.user.findMany({
      where: { active: true },
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

  async deactivate(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { active: false }
    })
  }

  async listPreRegistered() {
    const preRegistered = await prisma.$queryRaw<PreRegisteredUserRow[]>`
      SELECT id, name, email, cpf, status, "createdAt", "updatedAt"
      FROM "PreRegisteredUser"
      ORDER BY "createdAt" DESC
    `

    const registeredCpfs = await prisma.$queryRaw<{ cpf: string }[]>`
      SELECT cpf FROM "User" WHERE cpf IS NOT NULL AND active = true
    `

    const registeredCpfSet = new Set(registeredCpfs.map(user => user.cpf))

    return preRegistered.map(user => ({
      ...user,
      registered: registeredCpfSet.has(user.cpf)
    }))
  }

  async createPreRegistered(data: {
    name: string
    email: string
    cpf: string
    status: string
  }) {
    const cpf = this.normalizeCpf(data.cpf)
    if (cpf.length !== 11) throw new Error("CPF inválido")
    if (!["apto", "inapto"].includes(data.status)) throw new Error("Status inválido")

    const [created] = await prisma.$queryRaw<PreRegisteredUserRow[]>`
      INSERT INTO "PreRegisteredUser" (id, name, email, cpf, status, "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${data.name}, ${data.email}, ${cpf}, ${data.status}, NOW(), NOW())
      RETURNING id, name, email, cpf, status, "createdAt", "updatedAt"
    `

    return created
  }

  async updatePreRegistered(id: string, data: {
    name: string
    email: string
    cpf: string
    status: string
  }) {
    const cpf = this.normalizeCpf(data.cpf)
    if (cpf.length !== 11) throw new Error("CPF inválido")
    if (!["apto", "inapto"].includes(data.status)) throw new Error("Status inválido")

    const [updated] = await prisma.$queryRaw<PreRegisteredUserRow[]>`
      UPDATE "PreRegisteredUser"
      SET name = ${data.name},
          email = ${data.email},
          cpf = ${cpf},
          status = ${data.status},
          "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, name, email, cpf, status, "createdAt", "updatedAt"
    `

    if (!updated) throw new Error("Pré-cadastro não encontrado")

    return updated
  }
}
