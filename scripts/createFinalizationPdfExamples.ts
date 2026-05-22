import fs from "fs/promises"
import path from "path"
import { VotingFinalizationService } from "../src/modules/votings/votingFinalization.service"

async function main() {
  const outputDir = path.join(__dirname, "..", "tmp", "exemplos-pdf-finalizacao")
  await fs.mkdir(outputDir, { recursive: true })

  const service = new VotingFinalizationService() as any
  const finalizedAt = new Date()

  const resultPdf = service.buildResultPdf(
    "Eleição de exemplo - Sindicato dos Jornalistas de Minas",
    finalizedAt,
    [
      {
        title: "Escolha da chapa",
        type: "single",
        options: [
          { label: "Chapa União e Transparência", count: 142 },
          { label: "Chapa Renovação", count: 87 },
          { label: "Voto branco", count: 6 }
        ]
      },
      {
        title: "Conselho Fiscal",
        type: "multiple",
        options: [
          { label: "Ana Martins", count: 118 },
          { label: "Carlos Souza", count: 103 },
          { label: "Mariana Lima", count: 96 },
          { label: "Roberto Alves", count: 74 }
        ]
      }
    ],
    235,
    339,
    "https://backend-votes.onrender.com/downloads/exemplo-resultado-final.pdf"
  )

  const nonVotersPdf = service.buildNonVotersPdf(
    "Eleição de exemplo - Sindicato dos Jornalistas de Minas",
    finalizedAt,
    [
      { name: "João Silva", email: "joao.silva@example.com" },
      { name: "Maria Oliveira", email: "maria.oliveira@example.com" },
      { name: "Pedro Santos", email: "pedro.santos@example.com" },
      { name: "Fernanda Costa", email: "fernanda.costa@example.com" },
      { name: "Ricardo Almeida", email: "ricardo.almeida@example.com" }
    ],
    "https://backend-votes.onrender.com/downloads/exemplo-nao-votantes.pdf"
  )

  const resultPath = path.join(outputDir, "exemplo-resultado-final.pdf")
  const nonVotersPath = path.join(outputDir, "exemplo-nao-votantes.pdf")

  await fs.writeFile(resultPath, resultPdf)
  await fs.writeFile(nonVotersPath, nonVotersPdf)

  console.log(`PDF resultado: ${resultPath}`)
  console.log(`PDF não votantes: ${nonVotersPath}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
