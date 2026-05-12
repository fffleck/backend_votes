import { Router } from "express"
import { VotingStepController } from "./votingStep.controller"
import { authMiddleware } from "../../middlewares/auth"

const router = Router()
const controller = new VotingStepController()

router.use(authMiddleware)


router.post("/step", controller.createStep)
router.post("/option", controller.addOption)
router.get("/:votingId", controller.getSteps)

router.delete("/step/:stepId", controller.deleteStep)
router.delete("/option/:optionId", controller.deleteOption)

export default router