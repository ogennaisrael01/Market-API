// managing transactions

import { DataTypes, where } from "sequelize"
import { TransactionsModel, PaymentsModel, ProductModel, OrderModel } from "../../../index.js"
import { sequelize } from "../../common/utils/database.js"
import { notFound } from "../../common/utils/handlers.js"
import { logger } from "../../common/utils/loggers.js"
import { paymentStatus, tranactionStatus, transactionType } from "../../common/models/payments.js"
import { Payments } from "./payment_init_veri.js"
import { orderStatus } from "../../common/models/carts.js"


export class TransactionService{

    constructor() {}

    async createTransaction(validatedData){
        try{
            const new_transction = await TransactionsModel.create(validatedData)

            return new_transction

        }
        catch (err) {
            throw new Error("failed transction creation: "+ err.message)
        }

    }

    async getTransactionByPk(transactionId){

        if (!transactionId){
            return { status: false, message: "transactionId must be present"}
        }

        try{

            const transaction = TransactionsModel.findByPk(transactionId)
            if (!transaction){
                return { status: false, message: "transction not found"}
            }

            return {status: true, message: "found", instance: transaction}
        }
        catch (err){
            return { status: false, message: err}
        }
    }

    async getTransactionByIdempotecy(idempotencyKey){

        try{
            transaction = await TransactionsModel.findOne({ where: { idempotencyKey: idempotencyKey}})

            if (!transaction){
                return { status: false, message: "not_found"}
            }
            return { status: true, message: "found", instance: transaction}
        }
        catch (err){
        return { status: false, message: err.message}
        }
    }

    async processDuplicate(req){

        const idempotencykey = req.headers["X-Idempotency-Key"] || req.headers["x-idempotency-key"]
        const transaction = await this.getTransactionByIdempotecy(idempotencykey)
        if (transaction.status){
            return ok(res, { status: true, details: { message: "Duplicate Transaction", existing: transaction.instance}})
        }
    }

    async createPayments(orderId, ownerId, amount, referencKey) {
        try{
            orderId instanceof DataTypes.UUID
            ownerId instanceof DataTypes.UUID

            const newPayment = await PaymentsModel.create({
                                ownerId: ownerId,
                                orderId: orderId,
                                totalAmount: amount,
                                referenceKey: referencKey          
            })

            return newPayment
         
        }
        catch (err) {
            throw new Error(err.message)
        }
    }
    async processFailedPayment(payment){
        if ( !payment instanceof PaymentsModel){
            return { status: false, message: "the transaction is not a valid transaction"}
        }
        try{
            payment.status = paymentStatus.failed
            payment.failedAt = new Date()
            await payment.save()
            return { status: true, message: "transaction processsed"}
        }
        catch (err){
            return {status: false, message: err.message}
        }
    }

    async processCompletedPayment(payment){
        if ( !payment instanceof PaymentsModel){
            return { status: false, message: "the transaction is not a valid transaction"}
        }
        try{
            payment.status = paymentStatus.completed
            payment.completedAt = new Date()
            await payment.save()

            let order = payment.order

            order.status = orderStatus.completed
            await order.save()
            return { status: true, message: "transaction processsed"}
        }
        catch (err){
            return {status: false, message: err.message}
        }
    }

    async processCompletedTransaction(transaction){
        if ( !transaction instanceof TransactionsModel){
            return { status: false, message: "the transaction is not a valid transaction"}
        }
        try{
            transaction.status = tranactionStatus.completed
            transaction.completedAt = new Date()
            await transaction.save()
            return { status: true, message: "transaction processsed"}
        }
        catch (err){
            return {status: false, message: err.message}
        }
    }

        async processFailedTransaction(transaction){
        if ( !transaction instanceof TransactionsModel){
            return { status: false, message: "the transaction is not a valid transaction"}
        }
        try{
            transaction.status = tranactionStatus.failed
            transaction.failedAt = new Date()
            await transaction.save()
            return { status: true, message: "transaction processsed"}
        }
        catch (err){
            return {status: false, message: err.message}
        }
    }

    async processTransaction(req){
        
        const referenceKey = req.body.data.reference
        const status = req.body.data.status
        logger.info(`Processing transaction with status: ${status}`)

        try {
            await sequelize.transaction( async () => {
                
                const transaction = await TransactionsModel.findOne({
                    where: { referenceKey: referenceKey}
                })

                const payment = await PaymentsModel.findOne({
                    where: {referenceKey: referenceKey, status: paymentStatus.pending},
                    include: [
                        {model: OrderModel, as: "order"}
                    ]
                })

                if (!payment){
                    return {status: false, message: "payment not found with status pending: status: "+ payment.status}
                }

                if( transaction.status.trim() === tranactionStatus.completed){
                    logger.info("transaction already completed and closed")
                    return { status: false, message: "transaction already completed"}
                }

                if ( transaction.status.trim() === tranactionStatus.failed){
                    logger.info("transaction already failed and closed")
                    return { status: false, message: "transaction already failed"}
                }

                if ( status == "success" || status === "completed"){
                    await this.processCompletedTransaction(transaction)
                    await this.processCompletedPayment(payment)  
                }

                else if (status === 'failed' || status === "reversed"){
                    await this.processFailedTransaction(transaction)
                    await this.processFailedPayment(transaction)
                }
                else{
                    transaction.status = tranactionStatus.pending
                    transaction.save()
                }
            
            })
            return { status: true, message: "transaction processed"}
        }
        catch (err){

            return { status: false, message: err.message}
        }


    }

    async processOrderItems(orderItems){
        let vendorStorage = []

        for (let data of orderItems){
            // find product owners of all individual cart items
            const productId = data.productId
            const product = await ProductModel.findOne({
                where: {productId: productId}
            })
            
            const userId = product.ownerId
            const generalPrice = data.quantity * product.price

            const exists = vendorStorage.some(user => user.ownerId === userId)

            if ( exists ){
                let saved = vendorStorage.find(user => user.ownerId === userId)
                saved.price += generalPrice
                saved.quantity += data.quantity
            }

            else{
                vendorStorage.push({ownerId: userId, price: generalPrice, quantity: data.quantity})
            }
        }

        return vendorStorage
    }

    async processVendorPayment(productOwners, idempotencyKey){
        try{
            
            let transfers = []

            for (let productOwner of productOwners){
                const referenceKey = String(crypto.randomUUID())
                const amountKobo = Payments._amountKobo(productOwner.amount)

                transfers.push(
                    {amount: amountKobo, reference: referenceKey, recipient: productOwner.recipientCode}
                )
                const transactionPayload = {
                        ownerId:productOwner.ownerId,
                        referenceKey:referenceKey,
                        transactionType: transactionType.transfer,
                        amount: productOwner.amount,
                        idempotencyKey: idempotencyKey,
                    }
                
                await this.createTransaction(transactionPayload)
            }
            
            const paystackServive = new Payments()
            const paystackRespone = await paystackServive.initializeTransfer(transfers)

            return paystackRespone
        }
        catch (err){
            return {status: false, message: err.message}
        }

    }

    async VendorPaymentVerification(req){
        const referencekey = req.body.data.reference
        
        if (!referencekey){
            return { status: false, message: "no payment reference"}
        }

        try{
            await sequelize.transaction( async () => {

                const transaction = await TransactionsModel.findOne({
                    where: {referenceKey: referencekey}
                })
            
                if (transaction.status === tranactionStatus.completed){
                    logger.info("task already completed")
                    return { status: false, mesage: "transaction already completed"}
                }
                if (transaction.status == tranactionStatus.failed){
                    logger.info("task already failed")
                    return { status: false, message: "transacton already failed"}
                }
                
                const webhookStatus = req.body.data.status

                if ( webhookStatus !== "success"){
                    return { status: false, message: "can only process passed transaction"}
                }

                await this.processCompletedTransaction(transaction)
                logger.info("completed vendor payment")

            })

            return {status: true, message: "transaction_passed"}
        }
        catch (err){
            throw new Error(err.message)
        }
    }

    async failedPayment(req){

        const referenceKey = req.body.data.reference
        if (!referenceKey){
            return { status: false, message: "reference must be present"}
        }

        try{
            await sequelize.transaction(async () => {
                const transaction = await TransactionsModel.findOne({
                    where: { referencekey: referenceKey }
                })

                if (transaction.status === transactionStatus.completed){
                    return { status: false, message: "transaction already completed"}
                }
                if (transaction.status === transactionStatus.failed){
                    return { status: false, message: "transaction already failed"}
                }

                const webhookStatus = req.body.data.status
                if (webhookStatus !== "failed"){
                    return { status: false, message: "can only process failed transaction"}
                }

                await this.processFailedTransaction(transaction)
            })

            return { status: true, message: "transaction_failed" }
        }
        catch (err){
            throw new Error(err.message)
        }
    }

    async reversedPayment(req){
        await this.failedPayment(req)
    }
}

