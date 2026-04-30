
import { badRequest, notAutheenticated, ok } from "../common/utils/handlers.js";
import { validateConfirmPasswordChange, validateLogin, validateOnboard, validateResendCode, validateUserReg, validateVerification } from "../common/utils/ajv_validations.js";
import { createOtp, createUsers, getUserByEmail, getOtpByCode, verifyUserEmail, UpdateUserRole, changePassword } from "./services/auth_services.js";
import { generateAccessToken, generateOTPCode, verifyCode } from "./utils/jwt.js";
import { logger } from "../common/utils/loggers.js";
import { fullName, UserRole } from "../common/models/Users.js";
import { oneTimePasswordContent, passwordResetContent } from "./utils/email_content.js";
import { sendEmail } from "./utils/email_service.js";
import { isExpired, isUsed } from "../common/models/Otp.js";
import { loginOutSerializer } from "./utils/auth_profile_serializers.js";
import { UserModel } from "../../index.js";
import { ValidationError } from "ajv";


export const register = async (req, res) => {

    const request_data = req.body
        const isValid = validateUserReg(request_data)
    if (!isValid){
        return badRequest(res, {status: false, details: validateUserReg.errors})
    }

    const { email="", password="", firstName="", lastName="", username="", phone=""} = request_data

    // if (!isEmail(email)){
    //     return badRequest(res, { status: false, details: "email is invalid"})
    // }

    const userAlreadyExists = await getUserByEmail(email)

    if (userAlreadyExists.status){
        return ok(res, { status: true, details: "email found. try verifying your account!"})
    }
    const newUser = await createUsers(email, username, lastName, firstName, phone, password)
    
    if (!newUser.status){
        return badRequest(res, {status: false, details: newUser.message ?? "failed to create user"})
    }

    // if created then save otp code and send email
    try{
        const rawOtp = generateOTPCode()
        const oneTimePassword = await createOtp( newUser.user.userId, rawOtp)

        if (!oneTimePassword.status){
            logger.info(oneTimePassword.message)
            return badRequest(res, {status: false, details: oneTimePassword.message})

        }
        const toEmail = newUser.user.email ?? null
        const toName = fullName(newUser.user)

        const extra_content = { code: rawOtp.trim() }

        const content = oneTimePasswordContent(
            toName, toEmail, extra_content
        )
        const emailService = await sendEmail(content)
        if (!emailService.status){
            logger.info(emailService.message)
        }
    
    }
    catch (err) {
        logger.info(`Exception: ${err.message}`)
    }

    if (newUser.status){
        return ok(res, {status: true, details: "Account created check you email address"})
    }

    return badRequest(res,  { status: false, details: "failed to created user "})

}

export const verify = async(req, res) => {

    const requestBody = req.body
    const validBody = validateVerification(requestBody)
    
    if (!validBody) {
        return badRequest(res, { status: false, details: validateVerification.errors})
    }
    const { code } = requestBody

    const otpInstance = await getOtpByCode(code)

    if(!otpInstance.status){
        return badRequest(res, {status: otpInstance.status, details: otpInstance.instance ?? otpInstance.message})
    }
    // expired or used
    if (isExpired(otpInstance.instance, process.env.EXPIRY_TIME)) {
        return ok(res, { status: true, details: "Otp code has expired"} )
    }
    if ( isUsed(otpInstance.instance )){
        return ok(res, { status: true, details: "Otp code has been used"})
    }

    const userInstance = await otpInstance.instance.getOwner();
    if (userInstance.isVerified){
        return ok(res, {status: true, details: "User has been verified"})
    }

    const verifyUser = await verifyUserEmail(userInstance)
    
    if (verifyUser.status){
        otpInstance.instance.isUsed = true
        otpInstance.instance.save()
    }
    else{
        return ok(res, { status: true, details: verifyUser.message})
    }
    return ok(res, { status: true, details: {userId: userInstance.userId, fullName: fullName(userInstance)}})
}

export const resend = async (req, res) => {

    const requestBody = req.body
    
    const isValid = validateResendCode(requestBody)
    if (! isValid){
        return badRequest(res, { status: false, details: validateResendCode.errors})
    }

    const { email } = requestBody

    const userInstanceExists = await getUserByEmail(email)

    if (!userInstanceExists.status){
        return ok(res, {status: false, details: userInstanceExists.message})
    }
    const userInstance = userInstanceExists.user

    try{
        const rawOtp = generateOTPCode()
        const oneTimePassword = await createOtp( userInstance.userId, rawOtp)

        if (!oneTimePassword.status){
            logger.info(oneTimePassword.message)
            return badRequest(res, {status: false, details: oneTimePassword.message})

        }
        const toEmail = userInstance.email ?? null
        const toName = fullName(userInstance)

        const extra_content = { code: rawOtp.trim() }

        const content = oneTimePasswordContent(
            toName, toEmail, extra_content
        )
        const emailService = await sendEmail(content)
        if (!emailService.status){
            logger.info(emailService.message)
            return badRequest( res, {status: false, details: emailService.message})
        }
    } catch (err) {
        return badRequest(res, { status: false, details: err.message})
    }
    return ok(res, {status: true, details: "OTP sent"})
}

export const login = async (req, res) => {

    const loginData = req.body
    const isValid = validateLogin(loginData)

    if (!isValid){
        return badRequest(res, { status: false, details: validateLogin.errors})
    }

    const { email, password } = loginData

    const userExists = await getUserByEmail(email)

    if (!userExists.status){
        return ok(res, {status: false, details: userExists.message})
    }

    const userInstance = userExists.user

    if (!userInstance.isVerified || !userInstance.isActive ){
        return ok(res, {status: false, details: "your account is not verified"})
    }   

    // check user password
    const isValidPassword = await verifyCode(password, userInstance.password)
    if (!isValidPassword){
        return ok(res, { status: false, details: "Invalid credentials"})
    }

    // generate access code for user
    const accessToken = generateAccessToken(userInstance.username, userInstance.userId)
    return  ok(res, {status: true, details: loginOutSerializer(userInstance, accessToken) })
}

export const onboard = async (req, res) => {
    // onboard a user either as a customer or as a vendor 
    const onboardData = req.body
    const isValid = validateOnboard(onboardData)
    if (!isValid){
        return badRequest(res, {status: false, details: validateOnboard.errors})
    }
    const { role } = onboardData

    const activeUserId = req.user.userId
    if (!activeUserId){
        return notAutheenticated(res, { status: false, details: "auth credentials were not provided"})
    }

    const activeUser = await UserModel.findByPk(activeUserId)
    
    // users who's role have been updated should be blocked
    if (activeUser.role){
        return ok(res, {status: true, details: { activeRole: activeUser.role }})
    }
    if (role === UserRole.Customer){
        // update role to customer 
        const update = UpdateUserRole(activeUser, UserRole.Customer)
        if (!update.status){
        return badRequest(res, {status: false, details: update.message})

    }
    }
    else if (role === UserRole.Vendor){
        const update = UpdateUserRole(activeUser, UserRole.Vendor)
        if (!update.status){
        return badRequest(res, {status: false, details: update.message})

    }
    }
    else {
        return ok(res, {status: true, details: "Update coming..."})
    }

    
    const updatedUser = UserModel.findByPk(activeUser.userId)
    return ok(res, {status: true, details: { acitveRole: updatedUser.role}})
}

export const passwordChange = async (req, res) => {
    // password change request. require user email address to generate a new code for password change

    const changeRequestData = req.body

    const isValid = validateResendCode(changeRequestData)
    if (!isValid){
        return badRequest(res, {status: false, details: validateResendCode.errors})
    }
    const { email } = changeRequestData

    const user = await getUserByEmail(email)

    if (!user.status){
        return ok(res, {status: false, details: user.message})
    }

    const userInstance = user.user
    try{
        const rawOtp = generateOTPCode()
        const oneTimePassword = await createOtp( userInstance.userId, rawOtp)

        if (!oneTimePassword.status){
            logger.info(oneTimePassword.message)
            return badRequest(res, {status: false, details: oneTimePassword.message})

        }
        const toEmail = userInstance.email ?? null
        const toName = fullName(userInstance)

        const extra_content = { code: rawOtp.trim() }

        const content = passwordResetContent(
            toName, toEmail, extra_content
        )
        const emailService = await sendEmail(content)
        if (!emailService.status){
            logger.info(emailService.message)
            return badRequest( res, {status: false, details: emailService.message})
        }
    } catch (err) {
        return badRequest(res, { status: false, details: err.message})
    }
    return ok(res, {status: true, details: "Password reset code sent"})

}

export const passwordChangeConfirm = async (req, res) => {

    const data = req.body

    const isValid = validateConfirmPasswordChange(data)
    if (!isValid){
        return badRequest(res, {status: false, details: validateConfirmPasswordChange.errors})
    }

    const { code, newPassword, confirmPassword } = data
    if ( newPassword !== confirmPassword ){
        return ok(res, { status: false, details: "password mismatch"})
    }

    // validate code instance 
    const validateCode = await getOtpByCode(code)
    if (!validateCode.status){
        return badRequest(res, { status: false, details: validateCode.message})
    }

    const codeInstance = validateCode.instance
    if (codeInstance.isUsed || isExpired(codeInstance)){
        return badRequest(res, {status: false, details: "code invalid"})
    }

    const userInstance = await codeInstance.getOwner()
    console.log(userInstance)
    if (!userInstance){
        return badRequest(res, {status: false, details: "user not found"})
    }

    // change password is code is valid ( userInstance, password)
    const passwordIscChanged = await changePassword(userInstance, newPassword)
    if (!passwordIscChanged){
        return badRequest(res, { status: false, details: passwordIscChanged.message})
    }
    return ok(res, { status: true, details: "Password changed"} )
}
