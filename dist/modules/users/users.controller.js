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
    async deactivate(req, res) {
        if (!ensureAdmin(req, res))
            return;
        let { userId } = req.params;
        if (Array.isArray(userId))
            userId = userId[0];
        await service.deactivate(userId.toString());
        return res.json({ success: true });
    }
    async listPreRegistered(req, res) {
        if (!ensureAdmin(req, res))
            return;
        const users = await service.listPreRegistered();
        return res.json(users);
    }
    async createPreRegistered(req, res) {
        try {
            if (!ensureAdmin(req, res))
                return;
            const { name, email, cpf, status } = req.body;
            const user = await service.createPreRegistered({ name, email, cpf, status });
            return res.json(user);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async updatePreRegistered(req, res) {
        try {
            if (!ensureAdmin(req, res))
                return;
            let { id } = req.params;
            if (Array.isArray(id))
                id = id[0];
            const { name, email, cpf, status } = req.body;
            const user = await service.updatePreRegistered(id.toString(), { name, email, cpf, status });
            return res.json(user);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}
exports.UsersController = UsersController;
