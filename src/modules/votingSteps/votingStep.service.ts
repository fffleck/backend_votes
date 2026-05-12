import { prisma } from "../../config/prisma"

export class VotingStepService {

  async createStep(data: {
    votingId: string
    title: string
    type: "single" | "multiple"
    minSelect: number
    maxSelect: number
  }) {
    return prisma.votingStep.create({ data })
  }

  async addOption(stepId: string, label: string, imageUrl?: string) {
    return prisma.votingStepOption.create({
      data: { stepId, label, imageUrl }
    })
  }

  async getSteps(votingId: string) {
    return prisma.votingStep.findMany({
      where: { votingId },
      include: { options: true }
    })
  }
  async deleteStep(stepId: string) {
    // Exclui opções antes de excluir a etapa (por integridade)
    await prisma.votingStepOption.deleteMany({ where: { stepId } })
    return prisma.votingStep.delete({ where: { id: stepId } })
  }

  async deleteOption(optionId: string) {
    return prisma.votingStepOption.delete({ where: { id: optionId } })
  }
}