import { Router } from "express"
import authRoutes from "../modules/auth/auth.routes"
import votingRoutes from "../modules/votings/voting.routes"
import voteRoutes from "../modules/votes/vote.routes"
import votingStepRoutes from "../modules/votingSteps/votingStep.routes"
import usersRoutes from "../modules/users/users.routes"


const router = Router()


router.use("/auth", authRoutes)
router.use("/votings", votingRoutes)
router.use("/voting-steps", votingStepRoutes)
router.use("/votes", voteRoutes)
router.use("/users", usersRoutes)

export default router