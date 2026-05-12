"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingStepController = void 0;
const votingStep_service_1 = require("./votingStep.service");
const service = new votingStep_service_1.VotingStepService();
class VotingStepController {
    async createStep(req, res) {
        try {
            const { votingId, title, type, minSelect, maxSelect } = req.body;
            const step = await service.createStep({
                votingId,
                title,
                type,
                minSelect,
                maxSelect
            });
            return res.json(step);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async addOption(req, res) {
        try {
            const { stepId, label, imageUrl } = req.body;
            const option = await service.addOption(stepId, label, imageUrl);
            return res.json(option);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async getSteps(req, res) {
        const votingId = req.params.votingId;
        const steps = await service.getSteps(votingId);
        return res.json(steps);
    }
    async deleteStep(req, res) {
        try {
            let { stepId } = req.params;
            if (Array.isArray(stepId))
                stepId = stepId[0];
            await service.deleteStep(stepId.toString());
            return res.json({ success: true });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async deleteOption(req, res) {
        try {
            let { optionId } = req.params;
            if (Array.isArray(optionId))
                optionId = optionId[0];
            await service.deleteOption(optionId.toString());
            return res.json({ success: true });
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}
exports.VotingStepController = VotingStepController;
