"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoteService = void 0;
const prisma_1 = require("../../config/prisma");
const crypto_1 = require("../../providers/crypto");
class VoteService {
    async vote(userId, votingId, answers) {
        const voting = await prisma_1.prisma.voting.findUnique({
            where: { id: votingId },
            include: {
                steps: { include: { options: true } }
            }
        });
        if (!voting)
            throw new Error("Voting not found");
        if (voting.status !== "open") {
            throw new Error("Voting is not open");
        }
        const already = await prisma_1.prisma.vote.findFirst({
            where: { userId, votingId }
        });
        if (already) {
            throw new Error("User already voted");
        }
        for (const step of voting.steps) {
            const selected = answers[step.id];
            if (!selected) {
                throw new Error(`Step ${step.title} is required`);
            }
            if (step.type === "single") {
                if (Array.isArray(selected)) {
                    throw new Error("Invalid selection");
                }
            }
            if (step.type === "multiple") {
                if (!Array.isArray(selected)) {
                    throw new Error("Invalid selection");
                }
                if (selected.length < step.minSelect ||
                    selected.length > step.maxSelect) {
                    throw new Error("Invalid number of selections");
                }
            }
        }
        const payload = JSON.stringify({
            userId,
            votingId,
            answers,
            timestamp: new Date()
        });
        return prisma_1.prisma.vote.create({
            data: {
                userId,
                votingId,
                encryptedVote: (0, crypto_1.encrypt)(payload),
                voteHash: (0, crypto_1.hash)(payload)
            }
        });
    }
    async myVotes(userId) {
        const votes = await prisma_1.prisma.vote.findMany({ where: { userId }, select: { votingId: true } });
        return votes.map(v => v.votingId);
    }
    async results(votingId) {
        const votes = await prisma_1.prisma.vote.findMany({
            where: { votingId }
        });
        const parsedVotes = votes.map(v => {
            try {
                const decrypted = JSON.parse((0, crypto_1.decrypt)(v.encryptedVote));
                return decrypted.answers;
            }
            catch {
                return null;
            }
        }).filter(Boolean);
        return {
            totalVotes: parsedVotes.length,
            votes: parsedVotes
        };
    }
}
exports.VoteService = VoteService;
