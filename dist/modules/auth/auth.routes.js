"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const router = (0, express_1.Router)();
const controller = new auth_controller_1.AuthController();
router.post("/register", controller.register);
router.post("/login", controller.login);
exports.default = router;
