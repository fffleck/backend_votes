"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const authService = new auth_service_1.AuthService();
class AuthController {
    async register(req, res) {
        try {
            const { name, email, password, cpf } = req.body;
            const user = await authService.register(name, email, password, cpf);
            return res.json(user);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            return res.json(result);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }
}
exports.AuthController = AuthController;
