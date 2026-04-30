
import { Router } from "express";
import { addBankAccount, paymentApprove, payPaystack, paystackWebhookHandler, userTransactions } from "./controllers.js";
import { check } from "../middlewares/isAuthenticated.js";
import { isVendor, isAdmin } from "../common/utils/role_check.js";
import { idempotencyMiddleware } from "../middlewares/IdempotencyMiddleware.js"

export const paymentRouter = Router()

paymentRouter.post("/add-bank", check, isVendor,  addBankAccount) // add bank account for receivinig payments(vendor only upon registrations)

paymentRouter.post("/pay/:orderId", check, idempotencyMiddleware, payPaystack)
paymentRouter.post("/paystack/webhook", paystackWebhookHandler)
paymentRouter.post("/pay-vendors/:paymentId", check, isAdmin, idempotencyMiddleware, paymentApprove) // admin only
paymentRouter.get("/transactions", check, userTransactions)