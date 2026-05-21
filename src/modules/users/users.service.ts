import { prisma } from "../../config/prisma"
import { hashPassword } from "../../providers/hash"
import { InvitationEmailService } from "../emails/invitationEmail.service"

const EMAIL_BATCH_DELAY_MS = 5000

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class UsersService {
  private invitationEmailService = new InvitationEmailService()
  private invitationBatchRunning = false

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

  async sendInvitation(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        role: true,
        active: true
      }
    })

    if (!user || !user.active) throw new Error("Usuário não encontrado")
    if (user.role === "ADMIN") throw new Error("Convite disponível apenas para usuários votantes")
    if (!user.cpf) throw new Error("Usuário sem CPF cadastrado")

    console.log(`[email] Enviando convite para ${user.email}`)

    await this.invitationEmailService.sendInvitation({
      name: user.name,
      email: user.email,
      cpf: user.cpf
    })

    console.log(`[email] Convite enviado para ${user.email}`)

    return { success: true }
  }

  async getInvitationRecipients() {
    const users = await prisma.user.findMany({
      where: {
        active: true,
        role: "VOTER",
        cpf: { not: null }
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true
      },
      orderBy: { name: "asc" }
    })

    return users
  }

  async sendInvitationsToAllVoters() {
    const users = await this.getInvitationRecipients()

    const result = {
      total: users.length,
      sent: 0,
      failed: 0,
      failures: [] as { userId: string; email: string; error: string }[]
    }

    console.log(`[email] Iniciando envio de convites para ${users.length} usuários`)

    for (const [index, user] of users.entries()) {
      try {
        console.log(`[email] Enviando convite para ${user.email}`)
        await this.invitationEmailService.sendInvitation({
          name: user.name,
          email: user.email,
          cpf: user.cpf
        })
        result.sent++
        console.log(`[email] Convite enviado para ${user.email}`)
      } catch (error: any) {
        const message = error.message || "Erro ao enviar email"
        result.failed++
        result.failures.push({
          userId: user.id,
          email: user.email,
          error: message
        })
        console.error(`[email] Falha ao enviar convite para ${user.email}: ${message}`)
      }

      if (index < users.length - 1) {
        console.log(`[email] Aguardando ${EMAIL_BATCH_DELAY_MS / 1000} segundos antes do próximo envio`)
        await wait(EMAIL_BATCH_DELAY_MS)
      }
    }

    console.log(`[email] Envio de convites finalizado. Total: ${result.total}. Enviados: ${result.sent}. Falhas: ${result.failed}.`)

    return result
  }

  startInvitationBatch() {
    if (this.invitationBatchRunning) {
      console.log("[email] Envio em massa já está em andamento. Nova solicitação ignorada.")
      return { success: true, started: false, message: "Envio em massa já está em andamento." }
    }

    this.invitationBatchRunning = true
    console.log("[email] Envio em massa colocado em segundo plano.")

    setImmediate(() => {
      this.sendInvitationsToAllVoters()
        .catch(error => {
          console.error("[email] Falha inesperada no envio em massa:", error)
        })
        .finally(() => {
          this.invitationBatchRunning = false
          console.log("[email] Processo de envio em massa liberado para nova execução.")
        })
    })

    return { success: true, started: true, message: "Envio de convites iniciado em segundo plano." }
  }
}
