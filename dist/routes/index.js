"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const voting_routes_1 = __importDefault(require("../modules/votings/voting.routes"));
const vote_routes_1 = __importDefault(require("../modules/votes/vote.routes"));
const votingStep_routes_1 = __importDefault(require("../modules/votingSteps/votingStep.routes"));
const users_routes_1 = __importDefault(require("../modules/users/users.routes"));
const router = (0, express_1.Router)();
router.use("/auth", auth_routes_1.default);
router.use("/votings", voting_routes_1.default);
router.use("/voting-steps", votingStep_routes_1.default);
router.use("/votes", vote_routes_1.default);
router.use("/users", users_routes_1.default);
exports.default = router;
