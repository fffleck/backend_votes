"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VotingController = void 0;
const voting_service_1 = require("./voting.service");
const service = new voting_service_1.VotingService();
class VotingController {
    async create(req, res) {
        try {
            const { title, description, startDate, endDate } = req.body;
            const userId = req.user.userId;
            const voting = await service.create({
                title,
                description,
                createdBy: userId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            });
            return res.json(voting);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async list(req, res) {
        // @ts-ignore
        const role = req.user?.role || "VOTER";
        const votings = await service.list(role);
        return res.json(votings);
    }
    async findById(req, res) {
        try {
            const id = req.params.id;
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ error: "Invalid ID" });
            }
            const voting = await service.findById(id);
            return res.json(voting);
        }
        catch (err) {
            return res.status(404).json({ error: err.message });
        }
    }
    async update(req, res) {
        try {
            const id = req.params.id;
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ error: "Invalid ID" });
            }
            const { title, description, status, startDate, endDate } = req.body;
            const voting = await service.update(id, {
                title,
                description,
                status,
                startDate: startDate ? new Date(startDate) : startDate === null ? null : undefined,
                endDate: endDate ? new Date(endDate) : endDate === null ? null : undefined
            });
            return res.json(voting);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async open(req, res) {
        try {
            const id = req.params.id;
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ error: "Invalid ID" });
            }
            const voting = await service.open(id);
            return res.json(voting);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async close(req, res) {
        try {
            const id = req.params.id;
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ error: "Invalid ID" });
            }
            const voting = await service.close(id);
            return res.json(voting);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async finalize(req, res) {
        try {
            const id = req.params.id;
            if (!id || Array.isArray(id)) {
                return res.status(400).json({ error: "Invalid ID" });
            }
            if (req.user?.role !== "ADMIN") {
                return res.status(403).json({ error: "Only admin users can finalize votings" });
            }
            const voting = await service.finalize(id);
            return res.json(voting);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}
exports.VotingController = VotingController;
