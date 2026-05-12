"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const prisma_1 = require("../../config/prisma");
const hash_1 = require("../../providers/hash");
const jwt_1 = require("../../providers/jwt");
class AuthService {
    normalizeCpf(cpf) {
        return String(cpf || "").replace(/\D/g, "");
    }
    async register(name, email, password, cpf) {
        const normalizedCpf = this.normalizeCpf(cpf);
        if (normalizedCpf.length !== 11) {
            throw new Error("CPF inválido");
        }
        const [preRegistered] = await prisma_1.prisma.$queryRaw `
      SELECT status FROM "PreRegisteredUser" WHERE cpf = ${normalizedCpf} LIMIT 1
    `;
        if (!preRegistered) {
            throw new Error("CPF não encontrado no pré-cadastro");
        }
        if (preRegistered.status !== "apto") {
            throw new Error("CPF pré-cadastrado não está apto. Verifique com a administração.");
        }
        const userExists = await prisma_1.prisma.user.findUnique({
            where: { email }
        });
        if (userExists) {
            throw new Error("User already exists");
        }
        const [cpfAlreadyRegistered] = await prisma_1.prisma.$queryRaw `
      SELECT id FROM "User" WHERE cpf = ${normalizedCpf} LIMIT 1
    `;
        if (cpfAlreadyRegistered) {
            throw new Error("CPF já cadastrado");
        }
        const passwordHash = await (0, hash_1.hashPassword)(password);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: "VOTER"
            }
        });
        await prisma_1.prisma.$executeRaw `
      UPDATE "User" SET cpf = ${normalizedCpf} WHERE id = ${user.id}
    `;
        return { ...user, cpf: normalizedCpf };
    }
    async login(email, password) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            throw new Error("Invalid credentials");
        }
        const valid = await (0, hash_1.comparePassword)(password, user.passwordHash);
        if (!valid) {
            throw new Error("Invalid credentials");
        }
        const token = await (0, jwt_1.generateToken)(user.id);
        return { user: { ...user, role: user.role }, token };
    }
}
exports.AuthService = AuthService;
