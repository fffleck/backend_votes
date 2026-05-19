import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()
const dryRun = process.argv.includes("--dry-run")

function normalizeCpf(cpf: string | null) {
  return String(cpf || "").replace(/\D/g, "")
}

function initialPasswordFromCpf(cpf: string) {
  return cpf.slice(-5)
}

async function main() {
  const preRegisteredUsers = await prisma.preRegisteredUser.findMany({
    orderBy: { name: "asc" }
  })

  let created = 0
  let updated = 0
  let skipped = 0
  const skippedRows: { name: string; email: string; cpf: string; reason: string }[] = []

  for (const preUser of preRegisteredUsers) {
    const cpf = normalizeCpf(preUser.cpf)
    const email = preUser.email.trim().toLowerCase()

    if (cpf.length !== 11 || !email.includes("@")) {
      skipped++
      skippedRows.push({
        name: preUser.name,
        email: preUser.email,
        cpf: preUser.cpf,
        reason: "CPF ou email inválido"
      })
      continue
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email } })
    if (existingByEmail && existingByEmail.cpf && existingByEmail.cpf !== cpf) {
      skipped++
      skippedRows.push({
        name: preUser.name,
        email,
        cpf,
        reason: `Email já pertence ao CPF ${existingByEmail.cpf}`
      })
      continue
    }

    const existingByCpf = await prisma.user.findUnique({ where: { cpf } })
    if (existingByCpf && existingByCpf.email !== email) {
      skipped++
      skippedRows.push({
        name: preUser.name,
        email,
        cpf,
        reason: `CPF já pertence ao email ${existingByCpf.email}`
      })
      continue
    }

    const passwordHash = await bcrypt.hash(initialPasswordFromCpf(cpf), 10)
    const existingUser = existingByCpf || existingByEmail

    if (dryRun) {
      if (existingUser) updated++
      else created++
      continue
    }

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: preUser.name,
          email,
          cpf,
          passwordHash,
          role: existingUser.role === "ADMIN" ? "ADMIN" : "VOTER",
          active: true
        }
      })
      updated++
      continue
    }

    await prisma.user.create({
      data: {
        name: preUser.name,
        email,
        cpf,
        passwordHash,
        role: "VOTER",
        active: true
      }
    })
    created++
  }

  if (!dryRun && skipped === 0) {
    await prisma.preRegisteredUser.deleteMany()
  }

  console.log(`Pré-cadastros encontrados: ${preRegisteredUsers.length}`)
  console.log(`Usuários criados: ${created}`)
  console.log(`Usuários atualizados: ${updated}`)
  console.log(`Ignorados: ${skipped}`)

  if (skippedRows.length > 0) {
    console.table(skippedRows)
    console.log("A tabela de pré-cadastro não foi limpa porque há registros ignorados.")
  } else if (dryRun) {
    console.log("Modo dry-run: nenhum usuário foi alterado e a tabela de pré-cadastro não foi limpa.")
  } else {
    console.log("Tabela de pré-cadastro limpa com sucesso.")
  }
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
