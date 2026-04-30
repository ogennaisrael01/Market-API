
import { createHmac } from "crypto";
import { logger } from "../../common/utils/loggers.js";

export class PaystackService {

    constructor (){
    }


    static verify_signature(req){
        const secret = process.env.PAYSTACK_SECRE_KEY
        const hash = createHmac("sha512", secret).update(JSON.stringify(req.body)).digest("hex")

        return hash === req.headers['x-paystack-signature']

    }
    static headers(){
        return {
            "Authorization": `Bearer ${process.env.PAYSTACK_SECRE_KEY}`,
            "Content-Type": "application/json"
        }
    }

    static url( path ){
        return `${process.env.PAYSTACK_BASE_URL}/${path}`.trim()
    }

    static async handleResponse( response ) {

        try{
            const data = await response.json();

            if (!response.ok){
                throw new Error("Paystack service failed with status: "+ response.status +". \nReason: "+ data.message)
            }
            logger.info(`payastak data fetched with status ${ data.status}`)

            return data

        } catch (err){
            logger.error(err.message)
            throw new Error("Exceptions "+ err.message)
        }
    }

    }