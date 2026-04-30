
import { BrevoClient } from "@getbrevo/brevo";
import  fs  from "fs"
import path from "path";
import handlebars from "handlebars"
import { logger } from "../../common/utils/loggers.js";

const currentDir = import.meta.dirname


const brevoEmailInstanceHandler = async (subject, fromEmail, toEmail, 
                        htmlContent, fromName, toName, extra_content) => {
    
    const brevoApiKey = process.env.BREVO_API_KEY

    if (!brevoApiKey){
        throw new Error("Brevo api key must be present!")
    }

    const cleint = new BrevoClient( { apiKey: brevoApiKey } )

    try{
        cleint.transactionalEmails.sendTransacEmail( {
            htmlContent: htmlContent,
            sender: { name: fromName, email: fromEmail },
            to: [{ email: toEmail, name: toName }],
            subject: subject,
            params: extra_content
        })

        return true
    } catch (err){
        logger.error(`Failed to process email task: message ${err.message}`, { error: err.message })

        throw new Error(err.message)
    }

}

export const sendEmail = async (content) => {

    logger.info("Starting Task execution send email")

    const fromEmail = process.env.FROMEMAIL
    const fromName = process.env.FROMNAME
    const appName = process.env.APPNAME
    const expiryTime = process.env.EXPIRY_TIME

    const { subject = "", toEmail, toName="", templateName, message = "",  extra_content = {}} = content

    if (!toEmail){
        throw new Error("Cannot send an email without a reciever")
    }
    const templatePath = path.join(currentDir, "managements", templateName)
    const htmlString = fs.readFileSync(templatePath, "utf8")
    const template = handlebars.compile(htmlString)

    const  code = extra_content.code

    const finalHTML = template( {
        toName: toName, 
        appName: appName,
        code: code,
        expiry: expiryTime
    })

    const emailHandler = await brevoEmailInstanceHandler(
        subject, fromEmail, toEmail, 
        finalHTML, fromName, toName, extra_content
    )

    if (emailHandler){
        logger.info(`Email notification sent to ${toName}.`)
        return { status: true, message: "email sent"}
    }else{
        return { status: false, message: "failed to send email message"}
    }
}