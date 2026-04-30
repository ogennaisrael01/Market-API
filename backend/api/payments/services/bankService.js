
import { sequelize } from "../../common/utils/database.js"
import  { PaystackService } from "./paymentService.js"
import { BankAccountModel } from "../../../index.js"

export class BankAccountService {
    constructor() {
        this.UserModel = null 
        this.BankAccountModel = null
    }

    async getAccountByAccountNumber(accountNumber, user){

        if (!accountNumber || !user){
            return { status: false, message: "accountNumber and user must be present in the request"}
        }

        const bankAccount = await BankAccountModel.findOne({
            where: { accountNumber: accountNumber, ownerId: user.userId}
        })
        if (!bankAccount){
            return {status: false, message: "UserAccount not found"}
        }
        return { status:  true, instance: bankAccount, message: "found"}
    }

    static async ressolveBank(accountNumber, bankCode) { 
        const headers = PaystackService.headers()
      
        const options = {
            method: "GET",
            headers: headers
        }
        const path = `bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`.trimStart("/")
    
        const _url = PaystackService.url(path)

        try{
            const response = await fetch(_url, options)
            const data = PaystackService.handleResponse(response)

            return data

        } catch (err){
            throw new Error(err.message)
        }

    }

    static async bank() {

        const headers = PaystackService.headers()
        try{
            const options = {
                method: "GET",
                headers: headers
            }
            const path = "banks"
            const _url = PaystackService.url(path)

            const response = await fetch(_url, options)

            const data = PaystackService.handleResponse(response)
            return data
        }
        catch (err){
            throw new Error("Error"+ err.message)
        }
    }

    async createBankAccount(accountNumber, bankCode, accountName, bankId, ownerId){

        if (!this.BankAccountModel){
            return { status: false, message: "bank account model must be present"}
        }
        try {
            await sequelize.transaction( async () => {
                const [ bankAccount, created ]  = await this.BankAccountModel.findOrCreate({
                    where: { ownerId: ownerId},
                    defaults: {
                        accountName: accountName,
                        accountNumber: accountNumber,
                        bankCode: bankCode,
                        ownerId: ownerId,
                        bankId: bankId
                    }
                })

                if (!created){
                    bankAccount.set({
                        accountName: accountName,
                        accountNumber: accountNumber ,
                        bankCode: bankCode,
                        bankId: bankId

                    })
                    await bankAccount.save()

                }
            })
        
        } catch (err){
            return { status: false , message: err.message}
        }
        return { status: true, message: "created"}
    }

    static async createTransferReceipient(accountName, accountNumber, bankCode){

        const headers = PaystackService.headers()
        const path  = PaystackService.url("transferrecipient")
        const options = {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ 
                type: "nuban",
                name: accountName.trim(),
                account_number: accountNumber.trim(),
                bank_code: bankCode.trim(),
                currency: "NGN"
                })
        }
        
        console.log("options", options)
        try{
            const response = await fetch(path, options)
            const data = PaystackService.handleResponse(response)
            return data
        }
        catch (err){
            throw new Error("Error "+ err.message)
        }
    }

}