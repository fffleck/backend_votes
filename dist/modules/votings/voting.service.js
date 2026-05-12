"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingService = void 0;
const prisma_1 = require("../../config/prisma");
class VotingService {
    async autoUpdateStatuses() {
        const now = new Date();
        // draft → open: startDate chegou e ainda não passou o endDate
        await prisma_1.prisma.voting.updateMany({
            where: {
                status: "draft",
                startDate: { lte: now },
                OR: [{ endDate: null }, { endDate: { gt: now } }]
            },
            data: { status: "open" }
        });
        // open → closed: endDate passou
        await prisma_1.prisma.voting.updateMany({
            where: {
                status: "open",
                endDate: { lte: now }
            },
            data: { status: "closed" }
        });
    }
    async create(data) {
        return prisma_1.prisma.voting.create({
            data: {
                title: data.title,
                description: data.description,
                createdBy: data.createdBy,
                status: "draft",
                startDate: data.startDate,
                endDate: data.endDate
            }
        });
    }
    async list(role) {
        await this.autoUpdateStatuses();
        if (role === "ADMIN") {
            return prisma_1.prisma.voting.findMany({ orderBy: { createdAt: "desc" } });
        }
        return prisma_1.prisma.voting.findMany({
            where: { status: "open" },
            orderBy: { createdAt: "desc" }
        });
    }
    async findById(id) {
        const voting = await prisma_1.prisma.voting.findUnique({ where: { id } });
        if (!voting)
            throw new Error("Voting not found");
        return voting;
    }
    async open(id) {
        const voting = await this.findById(id);
        if (voting.status !== "draft")
            throw new Error("Only draft votings can be opened");
        return prisma_1.prisma.voting.update({ where: { id }, data: { status: "open" } });
    }
    async close(id) {
        const voting = await this.findById(id);
        if (voting.status !== "open")
            throw new Error("Only open votings can be closed");
        return prisma_1.prisma.voting.update({ where: { id }, data: { status: "closed" } });
    }
}
exports.VotingService = VotingService;
