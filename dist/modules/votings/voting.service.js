"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingService = void 0;
const prisma_1 = require("../../config/prisma");
const votingFinalization_service_1 = require("./votingFinalization.service");
class VotingService {
    constructor() {
        this.finalizationService = new votingFinalization_service_1.VotingFinalizationService();
    }
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
        // open → closed/finalized: endDate passou
        const expiredVotings = await prisma_1.prisma.voting.findMany({
            where: {
                status: "open",
                endDate: { lte: now },
                finalizedAt: null
            },
            select: { id: true }
        });
        for (const voting of expiredVotings) {
            await this.finalizationService.finalize(voting.id);
        }
    }
    async syncScheduledVotings() {
        await this.autoUpdateStatuses();
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
    async update(id, data) {
        await this.findById(id);
        if (data.status && !["draft", "open", "closed"].includes(data.status)) {
            throw new Error("Invalid status");
        }
        if (data.startDate && data.endDate && data.startDate >= data.endDate) {
            throw new Error("Start date must be before end date");
        }
        return prisma_1.prisma.voting.update({
            where: { id },
            data: {
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.status !== undefined ? { status: data.status } : {}),
                ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
                ...(data.endDate !== undefined ? { endDate: data.endDate } : {})
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
    async finalize(id) {
        const voting = await this.findById(id);
        if (voting.status === "draft")
            throw new Error("Draft votings cannot be finalized");
        return this.finalizationService.finalize(id);
    }
}
exports.VotingService = VotingService;
