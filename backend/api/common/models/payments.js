
import { DataTypes } from "sequelize";
import { sequelize } from "../utils/database.js";
import { defaultValueSchemable } from "sequelize/lib/utils";

export const paymentStatus = {
    pending: "PENDING",
    completed: 'COMPLETED',
    failed: "FAILED"
}

const Payments = {
    paymentId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true, primaryKey: true},
    orderId: { type: DataTypes.UUID, allowNull: false},
    ownerId: { type: DataTypes.UUID, allowNull: false},

    totalAmount: { type: DataTypes.INTEGER, defaultValue: 0},
    status: { type: DataTypes.STRING, defaultValue: paymentStatus.pending},
    completedAt: {type: DataTypes.DATE, defaultValue: null},
    failedAt: {type: DataTypes.DATE, defaultValue: null},
    referenceKey: { type: DataTypes.STRING, allowNull: false, unique: true}
}

export const transactionType = {
    deposit: "DEPOSIT",
    transfer: "TRANSFER"
}

export const tranactionStatus = {
    pending: "PENDING",
    completed: 'COMPLETED',
    failed: "FAILED"
}


const Transactions = {
    transactionId: {type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, unique: true},
    transactionType: {type: DataTypes.STRING, defaultValue: null},
    idempotencyKey: {type: DataTypes.UUID, unique: true},
    referenceKey: { type: DataTypes.STRING, unique: true},
    ownerId: { type: DataTypes.UUID, allowNull: false},
    amount: { type: DataTypes.INTEGER, allowNull: false},
    status: { type: DataTypes.STRING, defaultValue: tranactionStatus.pending},
    metaData: { type: DataTypes.JSON, defaultValue: {}},
    completedAt: { type: DataTypes.DATE, defaultValue: null},
    failedAt: {type: DataTypes.DATE, defaultValue: null},
}

const bankAccount = {
    // bank account for paying vendor
    accountId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true, primaryKey: true},
    ownerId: { type: DataTypes.UUID, unique: true, allowNull: false},

    accountName: { type: DataTypes.STRING, allowNull:true},
    accountNumber: { type: DataTypes.STRING, allowNull: false},
    bankCode: { type: DataTypes.STRING, allowNull: true},
    bankName: { type: DataTypes.STRING, allowNull: true},
    bankId: { type: DataTypes.STRING, allowNull: true},
    receipientCode: { type: DataTypes.STRING, allowNull: true},

    isVerified: { type: DataTypes.STRING, defaultValue: false}
}

export const WebhookStatus = {
    received: "RECIEVED",
    processing: "PROCESSING",
    processed: "PROCESSED",
    failed: "FAILED"
}
const WebhookEvent = {
    webhookId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true},
    referenceKey: {type: DataTypes.CHAR, allowNull: false},
    event: {type: DataTypes.STRING, allowNull: false},
    status: { type: DataTypes.STRING, defaultValue: WebhookStatus.received}
}

export const initBankAccount = sequelize => {
    return sequelize.define("bankAccount", bankAccount)
}

export const initWebhookEvent = sequelize => sequelize.define("webhook_events", WebhookEvent)
export const initPayments = sequelize => sequelize.define("payments", Payments)
export const initTransactions = sequelize => sequelize.define("transactions", Transactions)