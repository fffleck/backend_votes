import { Router } from "express"
import { VotingController } from "./voting.controller"
import { authMiddleware } from "../../middlewares/auth"

const router = Router()
const controller = new VotingController()

router.use(authMiddleware)

router.post("/", controller.create)
router.get("/", controller.list)
router.get("/:id", controller.findById)

router.post("/:id/open", controller.open)
router.post("/:id/close", controller.close)

export default router