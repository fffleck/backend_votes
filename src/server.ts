import "dotenv/config"
import app from "./app"
import { VotingService } from "./modules/votings/voting.service"

const PORT = process.env.PORT || 3000
const votingService = new VotingService()

async function syncScheduledVotings() {
  try {
    await votingService.syncScheduledVotings()
  } catch (err) {
    console.error("[votings] Erro ao sincronizar votações agendadas", err)
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  syncScheduledVotings()
  setInterval(syncScheduledVotings, 60 * 1000)
})
