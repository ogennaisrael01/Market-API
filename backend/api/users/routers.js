
import { Router } from "express";
import { getProfile, profilePublic, profileUpdate } from "./controllers.js";
import { check } from "../middlewares/isAuthenticated.js";

export const userRouter = Router();

userRouter.get("/profile", check, getProfile)
userRouter.patch("/profile", check, profileUpdate)
userRouter.get('/profile/:id', check, profilePublic)
