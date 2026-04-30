

// return a dict containing for email message
const APP_NAME = process.env.APPNAME

export const oneTimePasswordContent = (toName, toEmail, extra_content) => {

    const subject = "One Time Password Verification <"+APP_NAME+">"
    return {
        subject: subject, 
        toName: toName, 
        toEmail: toEmail,
        extra_content: extra_content,
        templateName: "onetp.html"
    }
}

export const passwordResetContent = (toName, toEmail, extra_content) => {
    const subject = `Passsowrd Reset Request <${APP_NAME}> `
    return {
        subject: subject,
        toName: toName,
        toEmail: toEmail,
        templateName: "passreset.html",
        extra_content: extra_content    
    }
}