import { notAutheenticated, serverError } from "../common/utils/handlers.js";
import pkg from "jsonwebtoken";

const { verify } = pkg;

export const check = async (req, res, next) => {

    const authHeader = req.headers['authorization']

    if (!authHeader){
        return notAutheenticated(res, {status: false, details: "Authentication credentials were not provided"})
    }

    const authCredentails = authHeader.split(" ")
    const bearer = authCredentails[0]
    
    if (bearer !== "Bearer") {
        return notAutheenticated(res, {status: false, details: "Invalid credentials were provided. Authentications requires a bearer token"})
    }

    const token = authCredentails[1]
    // decode payload 
    try{

        const payload = verify(token, process.env.JWT_SECRET)
        req.user = payload

        next();
    }catch (err) {
        return serverError(res, {status: false, details: err.message})
    }
}