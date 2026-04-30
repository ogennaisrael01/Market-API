
import { OneTimePassword, UserModel } from "../../../index.js";
import { hashCode, verifyCode } from "../utils/jwt.js";
import { logger } from "../../common/utils/loggers.js";
import { UserRole } from "../../common/models/Users.js";
import { sequelize } from "../../common/utils/database.js";
import { createProfile } from "../../users/services/user_service.js";

export const createUsers = async ( email, username, lastName, firstName, phone, password) => {
    try{
        logger.info("Task Excution. Creating New user!")
        const hashPassword = await hashCode(password)

        const newUser = await UserModel.create( { email, firstName, lastName, username, phone, password: hashPassword} )
        if (newUser){
            logger.info("User Created"+ " "+ newUser.userId)

            // create profile if user was created successfully
           const userProfileDict = await createProfile(newUser.userId)
            if (userProfileDict.status){
                return {status: true, user: newUser}
            }

            else{
                return {status: false, message: userProfileDict.message}
            }
        }
        else{
            logger.info("failed to create user")
            return {status: false, user: null, message: "failed to create user"}
        }

        
    }
    catch (err){
        logger.warn("Exception when creating new user"+ " "+ err.message)
        return { status: false, user: null, message: String(err.message)}
    }
} 

export const createOtp = async (userId, rawCode) => {

    try{
        const hash = await hashCode(rawCode)

        let otpIntance = await OneTimePassword.create( { ownerId: userId, rawCode: rawCode, hashCode: hash})

        if (!otpIntance){
            logger.info("failed to create otp instance")
            return { status: false, message: "otp not created"}
        }

        logger.info("Otp instance created for " + " " + userId)
        return { status: true, message: "otp created"}
    }
    catch (err){
        logger.info("failed to create otp code")
        return { status: false, message: String(err.message)}
    }

}

export const getUserByEmail = async (userEmail) => {
    if (!userEmail){
        logger.info("email must be present to get user by email")
        return {status: false, message: "provide email field"}
    }

    try{

        let user1 = await UserModel.findOne( { where: { email: userEmail}})

        if (user1){
            logger.info("User found")
            return { status: true, user: user1}
        }
        else {
            logger.info("user not found")
            return { status: false, message: "user not found"}
        }
    }
    catch (err){
        return {status: false, message: "error : "+ " "+ err.message}
    }
}

export const getOtpByCode = async code => {
     
    if (!code) {

        logger.info('"code" must be present')
        return { status: false, message: "provide code"}
    }
    try{
        const codeInstance = await OneTimePassword.findOne( {
                                    where: {rawCode: code},
                                    include: [{ model: UserModel, as: "owner"}]
                                } )

        if (!codeInstance){
            return {status: false, message: "Otp code instance not found"}
        }
        
        const storedhash = codeInstance.hashCode
        const isValid = await verifyCode(code, storedhash)

        if (isValid){
            logger.info("Otp found")
            return {status: true, instance: codeInstance}
        }
        else{
            logger.info(" otp instance not valid")
            return {status: false, instance: null}
        }
    }
    catch (err){
        logger.info(`exceptions while fetching otp code: ${err.message}`)
        return {status: false, message: err.message}
    }
}   

export const verifyUserEmail = async userInstance => {

    if (!userInstance instanceof UserModel){
        return { status: false, message: "Invalid instance "}
    }

    if ( userInstance.isVerified || userInstance.isActive){
        return { status: false, message: "user account already verified" }
    }
    try{

        userInstance.isVerified = true
        userInstance.isActive = true
        userInstance.updatedAt = new Date()
        userInstance.save()
        logger.info(`${userInstance.userId} is a verified user`)
    }
    catch (err){
        return {status: false, message: err.message}
    }

    return { status: true, instance: userInstance}
}

export const UpdateUserRole = async (userInstance, role) => {
    if (! userInstance instanceof UserModel){
        return {status: false, message: "user model is not a valid user instance"}
    }
    try{

        userInstance.role = role
        userInstance.save()
        return {stauts: true, message: "role updated"}
    }
    catch (err){
        return { status: false, message: err.message}
    }
}

export const changePassword = async (userInstance, password) => {

    try{
        await sequelize.transaction( async () => {
            const hashPassword =  await hashCode(password)
            userInstance.password = hashPassword
            await userInstance.save()
            
        })
        return { status: true, message: "password changed"}
    }
    catch (err){

        return { status: false, message: err.message}
    }
}