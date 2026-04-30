import { serverError } from "../common/utils/handlers.js"
import crypto from "crypto";


export const idempotencyMiddleware = (req, res, next) => {
    try{
        const idempotencykey = req.headers["X-Idempotency-Key"] || req.headers["x-idempotency-key"]
        if (!idempotencykey){
            // update the headers to include the idempotency key for future requests
            const newIdempotencyKey = crypto.randomUUID()
            req.headers["X-Idempotency-Key"] = newIdempotencyKey
        }

        next();
    }
    catch (err) {
        return serverError(res, { status: false, details: "Failed to process idempotency key: "+ err.message})
    }
}