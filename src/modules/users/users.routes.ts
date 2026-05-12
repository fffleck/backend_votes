import { Router } from "express"
import { UsersController } from "./users.controller"
import { authMiddleware } from "../../middlewares/auth"

const router = Router()
const controller = new UsersController()

router.use(authMiddleware)

router.get("/pre-registered", controller.listPreRegistered)
router.post("/pre-registered", controller.createPreRegistered)
router.put("/pre-registered/:id", controller.updatePreRegistered)

router.get("/", controller.list)
router.delete("/:userId", controller.deactivate)

export default router
