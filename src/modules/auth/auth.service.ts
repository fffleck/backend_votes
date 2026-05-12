import { prisma } from "../../config/prisma"
import { hashPassword, comparePassword } from "../../providers/hash"
import { generateToken } from "../../providers/jwt"

export class AuthService {

  private normalizeCpf(cpf: string) {
    return String(cpf || "").replace(/\D/g, "")
  }

  async register(name: string, email: string, password: string, cpf: string) {
    const normalizedCpf = this.normalizeCpf(cpf)

    if (normalizedCpf.length !== 11) {
      throw new Error("CPF inválido")
    }

    const [preRegistered] = await prisma.$queryRaw<{ status: string }[]>`
      SELECT status FROM "PreRegisteredUser" WHERE cpf = ${normalizedCpf} LIMIT 1
    `

    if (!preRegistered) {
      throw new Error("CPF não encontrado no pré-cadastro")
    }

    if (preRegistered.status !== "apto") {
      throw new Error("CPF pré-cadastrado não está apto. Verifique com a administração.")
    }

    const userExists = await prisma.user.findUnique({
      where: { email }
    })

    if (userExists) {
      throw new Error("User already exists")
    }

    const [cpfAlreadyRegistered] = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User" WHERE cpf = ${normalizedCpf} LIMIT 1
    `

    if (cpfAlreadyRegistered) {
      throw new Error("CPF já cadastrado")
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "VOTER"
      }
    })

    await prisma.$executeRaw`
      UPDATE "User" SET cpf = ${normalizedCpf} WHERE id = ${user.id}
    `

    return { ...user, cpf: normalizedCpf }
  }

  async login(email: string, password: string) {

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      throw new Error("Invalid credentials")
    }

    const valid = await comparePassword(password, user.passwordHash)

    if (!valid) {
      throw new Error("Invalid credentials")
    }

    const token = await generateToken(user.id)
    return { user: { ...user, role: user.role }, token }
  }
}
