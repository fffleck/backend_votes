"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingStepService = void 0;
const prisma_1 = require("../../config/prisma");
class VotingStepService {
    async createStep(data) {
        return prisma_1.prisma.votingStep.create({ data });
    }
    async addOption(stepId, label, imageUrl) {
        return prisma_1.prisma.votingStepOption.create({
            data: { stepId, label, imageUrl }
        });
    }
    async getSteps(votingId) {
        return prisma_1.prisma.votingStep.findMany({
            where: { votingId },
            include: { options: true }
        });
    }
    async deleteStep(stepId) {
        // Exclui opções antes de excluir a etapa (por integridade)
        await prisma_1.prisma.votingStepOption.deleteMany({ where: { stepId } });
        return prisma_1.prisma.votingStep.delete({ where: { id: stepId } });
    }
    async deleteOption(optionId) {
        return prisma_1.prisma.votingStepOption.delete({ where: { id: optionId } });
    }
}
exports.VotingStepService = VotingStepService;
