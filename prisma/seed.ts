import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  const email = "ffleck@gmail.com"

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log("Usuário admin já existe, seed ignorado.")
    return
  }

  const passwordHash = await bcrypt.hash("Admin@123", 10)

  await prisma.user.create({
    data: {
      name: "Administrador",
      email,
      passwordHash,
      role: "ADMIN",
      active: true
    }
  })

  console.log("Usuário admin criado com sucesso: ffleck@gmail.com")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
