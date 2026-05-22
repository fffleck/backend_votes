"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const voting_service_1 = require("./modules/votings/voting.service");
const PORT = process.env.PORT || 3000;
const votingService = new voting_service_1.VotingService();
async function syncScheduledVotings() {
    try {
        await votingService.syncScheduledVotings();
    }
    catch (err) {
        console.error("[votings] Erro ao sincronizar votações agendadas", err);
    }
}
app_1.default.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    syncScheduledVotings();
    setInterval(syncScheduledVotings, 60 * 1000);
});
