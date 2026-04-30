import { BankAccountModel, OrderItemsModel, OrderModel, PaymentsModel, ProductModel, TransactionsModel, UserModel, WebhookEventModel } from "../../index.js"
import { validateBankAccount } from "../common/utils/ajv_validations.js"
import { sequelize } from "../common/utils/database.js"
import { badRequest, notFound, ok, serverError } from "../common/utils/handlers.js"
import { BankAccountService } from "./services/bankService.js"
import { TransactionService } from "./services/transaction_services.js"
import { OrderService } from "../catalog/services/cartService.js"
import { logger } from "../common/utils/loggers.js"
import { tranactionStatus, transactionType, WebhookStatus } from "../common/models/payments.js"
import { Payments } from "./services/payment_init_veri.js"
import { PaystackService } from "./services/paymentService.js"
import { orderStatus } from "../common/models/carts.js"
import { Op, Transaction } from "sequelize"
import { orders } from "../catalog/controllers.js"


export const addBankAccount =  async (req, res) => {
    const requestData = req.body

    const isValid = validateBankAccount(requestData)
    if (!isValid){ 
        return badRequest(res, { status: false, details: validateBankAccount.errors})
    }

    const { accountNumber, bankCode } = requestData

    const userBankAccountService = new BankAccountService()
    
    const accountFound = await userBankAccountService.getAccountByAccountNumber(accountNumber, req.user)
    if (accountFound['status']){

        logger.info("account instance found for user "+ req.user.userId)
        const bankAccountFound = accountFound['instance']
    }
    // resolve bank account
    const resolveData = await BankAccountService.ressolveBank(accountNumber, bankCode)

    if (!resolveData.status){
        return serverError(res, { status: false, details: resolveData.message})
    }

    // save bank account for user
    const accountName = resolveData.data.account_name
    const bankId = resolveData.data.bank_id
    
    
    userBankAccountService.BankAccountModel = BankAccountModel

    const currentUserId = req.user?.userId

    const bankService = await userBankAccountService.createBankAccount(
        accountNumber, bankCode, accountName, bankId, currentUserId
    )

    if (!bankService.status){
        return badRequest(res, {status: false, details: userBankAccount.message})
    }

    // create transfer receipient 
    const bankAccount = await BankAccountModel.findOne({where: {ownerId: currentUserId}})
    const recipient = await BankAccountService.createTransferReceipient(
        bankAccount.accountName, bankAccount.accountNumber, bankAccount.bankCode
    )
    console.log(recipient)

    if (!recipient.status){
        return serverError(res, {status: false, details: recipient.message})
    }

    const receipientDetails = recipient.data

    await sequelize.transaction( async () => {
        bankAccount.receipientCode = receipientDetails.recipient_code
        bankAccount.accountName = receipientDetails.details?.account_name
        bankAccount.bankName = receipientDetails.details?.bank_name
        bankAccount.isVerified = true 

        await bankAccount.save()

        
     })

    return ok(res, {status: true, details: bankAccount})
}

export const payPaystack = async (req, res) => {
    const transactionService = new TransactionService()

    try{ 
        await transactionService.processDuplicate(req)
    }
    catch (err){
        return serverError(res, {status: false, details: err.message})
    }
    const currentUser = req.user
    const { orderId } = req.params

    const order = await OrderModel.findOne({ 
        where: { orderId: orderId, ownerId: currentUser.userId, status: orderStatus.pending},
        include: [
            {model: OrderItemsModel, as: "orderItems"},
            { model: UserModel, as: "owner"}
        ]
    })

    if (!order){
        return notFound(res, {status: false, details: "order not found with the given Id"})
    }
    
    const orderService = new OrderService()
    if (!order.orderItems){
        return notFound(res, {status: false, details: "no items found for this order"})
    }
    const totalAmount = await OrderService.totalAmount(order.orderItems)

    logger.info("total  price for this order: "+ totalAmount.total)
    const userEmail = order.owner.email

    // prepare transactions
    const referenceKey = String(crypto.randomUUID())
    const idempotencyKey = req.headers["X-Idempotency-Key"] || req.headers["x-idempotency-key"]

    const transactionPayload = {
        ownerId:currentUser.userId,
        referenceKey:referenceKey,
        transactionType: transactionType.deposit,
        amount: totalAmount.total,
        idempotencyKey: idempotencyKey,
    }

    try{
        await sequelize.transaction( async () => {

            const transaction = await transactionService.createTransaction(transactionPayload)

            // initiate payment via paystack
            const paystackService = new Payments()
            const paystackData = await paystackService.initializePayment(totalAmount.total, userEmail, referenceKey)

            if (!paystackData.status){
                return serverError(res, {status: false, details: paystackData.message})

            }

            // create payment for this order, mark as pending(complete payment only when admin approves)
            const payment = await transactionService.createPayments(order.orderId, currentUser.userId, totalAmount.total, referenceKey)

            return ok(res, {status: true, details: paystackData})
        })

       
    }
    catch (err){
        return serverError(res, {status: false, details: err.message})
    }

}

export const paystackWebhookHandler = async (req, res) => {
    logger.info("webhook Found. processing payment!!")

    res.sendStatus(200)

    if(!PaystackService.verify_signature(req)){
        return;
    }
    const transactionService = new TransactionService()

    const event = req.body.event
    logger.info(`event: ${event}`)
    const referenceKey = req.body.data.reference
    try{
        const [ webhookEvent, created ] = await WebhookEventModel.findOrCreate({
                where: {referenceKey: referenceKey},
                defaults: {
                    event: event,
                    status: WebhookStatus.received
                }
        })
        try{

            if(!created){
                logger.info("Duplicate webhook found for the instance,")
                return;

            }
            
            if (event.trim() == "charge.success"){
                logger.info("Starting transaction processing.")
                await transactionService.processTransaction(req)
            }
            else if (event.trim() == "transfer.success"){ 
                logger.info("Starting Task for status: "+ event)
                const response = await transactionService.VendorPaymentVerification(req)
                console.log(response)
            }
            else if (event.trim() == "transfer.failed"){
                logger.info("Starting Task for status: "+ event)
                await transactionService.failedPayment(req)
            }
            else if (event.trim() == "transfer.reversed"){
                logger.info("stating Tasl for status: "+ event)
                await transactionService.reversedPayment(req)
            }
            else {
                webhookEvent.status = WebhookStatus.processed
                await webhookEvent.save()
            }

            webhookEvent.status = WebhookStatus.processed
            await webhookEvent.save()
        }
        catch (err){
            webhookEvent.status = WebhookStatus.failed
            await webhookEvent.save()
        }
    }
    catch (err){
        logger.error(`server Error: ${err.message}`)
    }

    logger.info('Task completed')
}

export const paymentApprove = async (req, res) => {
    const transactionService = new TransactionService()

    try{ 
        await transactionService.processDuplicate(req)
    }
    catch (err){
        return serverError(res, {status: false, details: err.message})
    }

    const { paymentId } = req.params  
    const currentUser = req.user

    const payment = await PaymentsModel.findOne({
        where: { paymentId: paymentId },
        include: [
            { 
                model: OrderModel, as: "order",
                include: [
                    {
                        model: OrderItemsModel, as: "orderItems",
                    }
                ]
            }
        ]
    })
    if (!payment){
        return notFound(res, {status: false, details: "payment_not_found"})
    }

    if(!payment.order){
        return notFound(res, {status: false, details: "order_not_found"})
    }

    if( payment.order.status.trim() !== orderStatus.completed){
        return badRequest(res, {status: false, details: "order cannot be processed with status: "+ payment.order.status})
    }
    
    const referenceKey = payment.referenceKey.trim()
    const transaction = await TransactionsModel.findOne({
        where: { referenceKey: referenceKey}
    })
    if (!transaction){
        return notFound(res, {status: false, details: "transaction not found for this payment"})
    }

    logger.info(`transaction_status: ${transaction.status.trim()}`)
    if (transaction.status.trim() !== tranactionStatus.completed){
        return badRequest(res, {status: false, details: "cannot process transaction with status: "+ transaction.status})
    }

    const orderItems = payment.order.orderItems

    if(orderItems.length < 1){
        return ok(res, {status: true, details: "no order items to process"})
    }

    const storage = await transactionService.processOrderItems(orderItems)
  
    const transfers = []
    for (let owner of storage){
        try{
            const quantity = owner.quantity
            const price = owner.price
            const totalAmount = price - (quantity / 100 * price) // deduct platform percentage

            const ownerId = owner.ownerId

            const vendorBank = await BankAccountModel.findOne({
                where: {ownerId: ownerId}
            })

            if (!vendorBank){
                // fail transaction
                return badRequest(res, {status: false, message: "transaction terminated: no banka account"})
            }
            if (!vendorBank.receipientCode){
                    return badRequest(res, {status: false, message: "transaction terminated: recipeint code empty"})
                }
                
            transfers.push({
                amount: totalAmount,
                recipientCode: vendorBank.receipientCode.trim(),
                ownerId: ownerId
            })
        
        }
        catch (err){
            return serverError(res, {status: false, details:err.message})
        }

        await sequelize.transaction( async () => {
            
            const transferTransaction = await transactionService.processVendorPayment(
                transfers, req.headers["X-Idempotency-Key"] || req.headers["x-idempotency-key"]
            )
            
            if (!transferTransaction.status){
                return serverError(res, {status: false, details: transferTransaction.message})
            }

            return ok(res, {status: true, details: transferTransaction.message})
        })
    }
}

export  const userTransactions = async (req, res) => {

    const { status, type, page = 1} = req.query
    const currentUser = req.user

    const limit = 10
    const offSet = (parseInt(page) - 1) * limit

    const queryBuilder = {
        where: { ownerId: currentUser.userId},
        limit: limit,
        offset: offSet,
        order: [[ "createdAt", "DESC"]]
    }

    if (status){
        queryBuilder.where.status = { [Op.iLike]: `%${status}%`}
    }
    if (type){
        queryBuilder.where.transactionType = { [Op.iLike]: `%${type}%`}
    }

    try{
        const transactions = await TransactionsModel.findAll(queryBuilder)

        if ( transactions.length < 1){
            return ok(res, {status: true, details: "No transactions"})
        }

        return ok(res, {status: true, totalTransactions: transactions.length, details: transactions})

    }
    catch (err){
        return serverError(res, {status: false, message: err.message})
    }
}