import pkg from "jsonwebtoken";
import bcrypt from "bcrypt";
import { logger } from "../../common/utils/loggers.js";
import { createHash } from "crypto";
 
const { sign } = pkg


const OTPLength = process.env.OTPLength ?? 6

export const generateOTPCode = () => {
    let otp_code = []
    for (let i=1; i <= OTPLength; i++) {
        let randomDigit = Math.floor(Math.random() * 10)
        otp_code.push(randomDigit)
    }
    return otp_code.join().replaceAll(",", "")

}

export const hashCode = async (code) => {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds)
    const hash = await bcrypt.hash(code, salt)
    return hash
}

export const verifyCode = async (code, hashedCode) => {
    const match = await bcrypt.compare(code.trim(), hashedCode.trim())
    return match
}
export const generateAccessToken = (username, userId) => {
    const SECRET_KEY = process.env.JWT_SECRET

    if (!SECRET_KEY){
        throw new Error("SECRET KEY must be present")
    }

    try{
        const expiresIn = "30m"
        const accessToken = sign({ username, userId}, SECRET_KEY, {expiresIn: expiresIn})

        logger.info(`Access Token generate ${accessToken.slice(0, 10)}...`)
        return accessToken

    }
    catch (err){
        logger.error(`failed tp generate access token: error(${err.mesage})`)
        throw new Error("failed tp generate new token "+ " " + err.message)
    }
}