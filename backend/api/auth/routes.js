import { Router } from "express";
import { login, onboard, passwordChange, passwordChangeConfirm, register, resend, verify } from "./controllers.js";
import { check } from "../middlewares/isAuthenticated.js";

export const authRouter = Router();


authRouter.post("/register", register)
authRouter.post("/verify-email", verify)
authRouter.post("/resend", resend)
authRouter.post("/login", login)
authRouter.patch("/onboard", check, onboard)
authRouter.post("/password-change", passwordChange)
authRouter.post("/password-confirm", passwordChangeConfirm)