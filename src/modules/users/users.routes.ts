import { Router } from "express"
import { UsersController } from "./users.controller"
import { authMiddleware } from "../../middlewares/auth"

const router = Router()
const controller = new UsersController()

router.use(authMiddleware)

router.get("/", controller.list)
router.post("/", controller.create)
router.patch("/:userId/password", controller.updatePassword)
router.delete("/:userId", controller.deactivate)

export default router
