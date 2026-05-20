"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoteController = void 0;
const vote_service_1 = require("./vote.service");
const service = new vote_service_1.VoteService();
class VoteController {
    async vote(req, res) {
        try {
            const userId = req.user.userId;
            const { votingId, answers } = req.body;
            const vote = await service.vote(userId, votingId, answers);
            return res.json(vote);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async myVotes(req, res) {
        const userId = req.user.userId;
        const result = await service.myVotes(userId);
        return res.json(result);
    }
    async myLatestVote(req, res) {
        const userId = req.user.userId;
        const vote = await service.myLatestVote(userId);
        return res.json({ vote });
    }
    async results(req, res) {
        const votingId = req.params.votingId;
        const result = await service.results(votingId);
        return res.json(result);
    }
}
exports.VoteController = VoteController;
