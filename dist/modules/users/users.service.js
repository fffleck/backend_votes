"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const prisma_1 = require("../../config/prisma");
const hash_1 = require("../../providers/hash");
const invitationEmail_service_1 = require("../emails/invitationEmail.service");
class UsersService {
    constructor() {
        this.invitationEmailService = new invitationEmail_service_1.InvitationEmailService();
    }
    normalizeCpf(cpf) {
        return String(cpf || "").replace(/\D/g, "");
    }
    async list() {
        const users = await prisma_1.prisma.user.findMany({
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
        });
        const voteCounts = await prisma_1.prisma.vote.groupBy({
            by: ["userId"],
            _count: { userId: true },
            where: {
                userId: { in: users.map(user => user.id) }
            }
        });
        const voteCountByUserId = new Map(voteCounts.map(voteCount => [voteCount.userId, voteCount._count.userId]));
        return users.map(user => {
            const voteCount = voteCountByUserId.get(user.id) || 0;
            return {
                ...user,
                voteCount,
                hasVoted: voteCount > 0,
                canChangePassword: user.role !== "ADMIN" && voteCount === 0
            };
        });
    }
    async deactivate(userId) {
        return prisma_1.prisma.user.update({
            where: { id: userId },
            data: { active: false }
        });
    }
    async create(data) {
        const name = String(data.name || "").trim();
        const email = String(data.email || "").trim().toLowerCase();
        const cpf = this.normalizeCpf(data.cpf);
        const password = String(data.password || "");
        if (!name)
            throw new Error("Informe o nome");
        if (!email.includes("@"))
            throw new Error("Informe um email válido");
        if (cpf.length !== 11)
            throw new Error("Informe um CPF válido");
        if (password.length < 5)
            throw new Error("A senha deve ter no mínimo 5 caracteres");
        const existingByEmail = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingByEmail)
            throw new Error("Já existe usuário com este email");
        const existingByCpf = await prisma_1.prisma.user.findUnique({ where: { cpf } });
        if (existingByCpf)
            throw new Error("Já existe usuário com este CPF");
        const passwordHash = await (0, hash_1.hashPassword)(password);
        return prisma_1.prisma.user.create({
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
        });
    }
    async updatePassword(userId, password) {
        if (!password || password.length < 5) {
            throw new Error("A senha deve ter no mínimo 5 caracteres");
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, active: true }
        });
        if (!user || !user.active)
            throw new Error("Usuário não encontrado");
        if (user.role === "ADMIN")
            throw new Error("Não é permitido alterar senha de usuário ADMIN por esta tela");
        const voteCount = await prisma_1.prisma.vote.count({ where: { userId } });
        if (voteCount > 0)
            throw new Error("Não é possível alterar a senha de usuário que já votou");
        const passwordHash = await (0, hash_1.hashPassword)(password);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash }
        });
        return { success: true };
    }
    async sendInvitation(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                cpf: true,
                role: true,
                active: true
            }
        });
        if (!user || !user.active)
            throw new Error("Usuário não encontrado");
        if (user.role === "ADMIN")
            throw new Error("Convite disponível apenas para usuários votantes");
        if (!user.cpf)
            throw new Error("Usuário sem CPF cadastrado");
        await this.invitationEmailService.sendInvitation({
            name: user.name,
            email: user.email,
            cpf: user.cpf
        });
        return { success: true };
    }
    async sendInvitationsToAllVoters() {
        const users = await prisma_1.prisma.user.findMany({
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
        });
        const result = {
            total: users.length,
            sent: 0,
            failed: 0,
            failures: []
        };
        for (const user of users) {
            try {
                await this.invitationEmailService.sendInvitation({
                    name: user.name,
                    email: user.email,
                    cpf: user.cpf
                });
                result.sent++;
            }
            catch (error) {
                result.failed++;
                result.failures.push({
                    userId: user.id,
                    email: user.email,
                    error: error.message || "Erro ao enviar email"
                });
            }
        }
        return result;
    }
}
exports.UsersService = UsersService;
