// payment initialization and verification

import { PaystackService } from "./paymentService.js";
import { logger } from "../../common/utils/loggers.js";


export class Payments {
    constructor() {
        this.paystackChannels = process.env.PAYSTACK_CHANNELS.split(",")
    }
    
    static _amountKobo(amount){
        return amount * 100
    }

    async initializePayment (amount, email, referenceKey){

        const headers = PaystackService.headers()
        const path = PaystackService.url("transaction/initialize")
        const amountKobo = Payments._amountKobo(amount)

        const payload = {
            email: email, 
            amount: amountKobo,
            reference: referenceKey,
            channels: this.paystackChannels,
            currency: 'NGN'
        }
        
        const options = {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        }

        try{

            const response = await fetch(path, options)
            const data = PaystackService.handleResponse(response)

            return data
        }
        catch (err){
            logger.error("Paystack response failed: "+ err)
            throw new Error(err)
        }
    }

    async initializeTransfer(transfers){

        const payload = {
            source: "balance",
            currency: "NGN",
            transfers: transfers
        }

        const headers = PaystackService.headers()
        const options = {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        }

        const path = PaystackService.url("transfer/bulk")
        try{
            const response = await fetch(path, options)
            const data = await PaystackService.handleResponse(response)

            return data
        }
        catch (err){
            throw new Error(err.message)
        }
    }
}