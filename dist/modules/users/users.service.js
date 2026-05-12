"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const prisma_1 = require("../../config/prisma");
const crypto_1 = require("crypto");
class UsersService {
    normalizeCpf(cpf) {
        return String(cpf || "").replace(/\D/g, "");
    }
    async list() {
        return prisma_1.prisma.user.findMany({
            where: { active: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });
    }
    async deactivate(userId) {
        return prisma_1.prisma.user.update({
            where: { id: userId },
            data: { active: false }
        });
    }
    async listPreRegistered() {
        const preRegistered = await prisma_1.prisma.$queryRaw `
      SELECT id, name, email, cpf, status, "createdAt", "updatedAt"
      FROM "PreRegisteredUser"
      ORDER BY "createdAt" DESC
    `;
        const registeredCpfs = await prisma_1.prisma.$queryRaw `
      SELECT cpf FROM "User" WHERE cpf IS NOT NULL AND active = true
    `;
        const registeredCpfSet = new Set(registeredCpfs.map(user => user.cpf));
        return preRegistered.map(user => ({
            ...user,
            registered: registeredCpfSet.has(user.cpf)
        }));
    }
    async createPreRegistered(data) {
        const cpf = this.normalizeCpf(data.cpf);
        if (cpf.length !== 11)
            throw new Error("CPF inválido");
        if (!["apto", "inapto"].includes(data.status))
            throw new Error("Status inválido");
        const [created] = await prisma_1.prisma.$queryRaw `
      INSERT INTO "PreRegisteredUser" (id, name, email, cpf, status, "createdAt", "updatedAt")
      VALUES (${(0, crypto_1.randomUUID)()}, ${data.name}, ${data.email}, ${cpf}, ${data.status}, NOW(), NOW())
      RETURNING id, name, email, cpf, status, "createdAt", "updatedAt"
    `;
        return created;
    }
    async updatePreRegistered(id, data) {
        const cpf = this.normalizeCpf(data.cpf);
        if (cpf.length !== 11)
            throw new Error("CPF inválido");
        if (!["apto", "inapto"].includes(data.status))
            throw new Error("Status inválido");
        const [updated] = await prisma_1.prisma.$queryRaw `
      UPDATE "PreRegisteredUser"
      SET name = ${data.name},
          email = ${data.email},
          cpf = ${cpf},
          status = ${data.status},
          "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING id, name, email, cpf, status, "createdAt", "updatedAt"
    `;
        if (!updated)
            throw new Error("Pré-cadastro não encontrado");
        return updated;
    }
}
exports.UsersService = UsersService;
