"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const users_service_1 = require("./users.service");
const service = new users_service_1.UsersService();
function ensureAdmin(req, res) {
    if (req.user?.role !== "ADMIN") {
        res.status(403).json({ error: "Acesso negado" });
        return false;
    }
    return true;
}
class UsersController {
    async list(req, res) {
        if (!ensureAdmin(req, res))
            return;
        const users = await service.list();
        return res.json(users);
    }
    async create(req, res) {
        try {
            if (!ensureAdmin(req, res))
                return;
            const { name, email, cpf, password } = req.body;
            const user = await service.create({ name, email, cpf, password });
            return res.json(user);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async deactivate(req, res) {
        if (!ensureAdmin(req, res))
            return;
        let { userId } = req.params;
        if (Array.isArray(userId))
            userId = userId[0];
        await service.deactivate(userId.toString());
        return res.json({ success: true });
    }
    async updatePassword(req, res) {
        try {
            if (!ensureAdmin(req, res))
                return;
            let { userId } = req.params;
            if (Array.isArray(userId))
                userId = userId[0];
            const { password } = req.body;
            const result = await service.updatePassword(userId.toString(), password);
            return res.json(result);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async sendInvitation(req, res) {
        try {
            if (!ensureAdmin(req, res))
                return;
            let { userId } = req.params;
            if (Array.isArray(userId))
                userId = userId[0];
            const result = await service.sendInvitation(userId.toString());
            return res.json(result);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async sendInvitationsToAllVoters(req, res) {
        try {
            if (!ensureAdmin(req, res))
                return;
            const result = service.startInvitationBatch();
            return res.json(result);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}
exports.UsersController = UsersController;
