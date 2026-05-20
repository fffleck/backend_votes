import "dotenv/config"
import { InvitationEmailService } from "../src/modules/emails/invitationEmail.service"

const to = process.argv[2] || "ffleck@gmail.com"

async function main() {
  const service = new InvitationEmailService()

  await service.sendInvitation({
    name: "Usuário de teste",
    email: to,
    cpf: "12345678900"
  })

  console.log(`Email de exemplo enviado para ${to}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
