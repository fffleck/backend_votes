import { Router } from "express"
import { VoteController } from "./vote.controller"
import { authMiddleware } from "../../middlewares/auth"

const router = Router()
const controller = new VoteController()

router.use(authMiddleware)

router.post("/", controller.vote)
router.get("/my-votes", controller.myVotes)
router.get("/:votingId/results", controller.results)

export default router