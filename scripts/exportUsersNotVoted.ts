import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

const prisma = new PrismaClient()

function escapeHtml(value: string | null) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

async function main() {
  const votedUserIds = await prisma.vote.findMany({
    distinct: ["userId"],
    select: { userId: true }
  })

  const users = await prisma.user.findMany({
    where: {
      active: true,
      role: "VOTER",
      id: { notIn: votedUserIds.map(vote => vote.userId) }
    },
    select: {
      name: true,
      email: true
    },
    orderBy: { name: "asc" }
  })

  const generatedAt = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })

  const rows = users.map(user => `
    <tr>
      <td>${escapeHtml(user.name)}</td>
      <td>${escapeHtml(user.email)}</td>
    </tr>
  `).join("")

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; }
      th, td { border: 1px solid #999; padding: 8px; }
      th { background: #e5e7eb; font-weight: bold; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <th colspan="2">Usuários que ainda não votaram</th>
      </tr>
      <tr>
        <td>Gerado em</td>
        <td>${escapeHtml(generatedAt)}</td>
      </tr>
      <tr>
        <td>Total</td>
        <td>${users.length}</td>
      </tr>
      <tr></tr>
      <tr>
        <th>Nome</th>
        <th>Email</th>
      </tr>
      ${rows}
    </table>
  </body>
</html>`

  const outputDir = path.join(__dirname, "..", "tmp")
  const outputFile = path.join(outputDir, "usuarios-que-nao-votaram.xls")

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputFile, `\ufeff${html}`, "utf8")

  console.log(`Arquivo gerado: ${outputFile}`)
  console.log(`Total de usuários que ainda não votaram: ${users.length}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
