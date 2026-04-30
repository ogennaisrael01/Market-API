import { config } from "dotenv";
config();

import express from "express";
import { sequelize } from "./api/common/utils/database.js";
import { initModel, initProfile } from "./api/common/models/Users.js";
import { logger } from "./api/common/utils/loggers.js"
import { initOneTImePassword } from "./api/common/models/Otp.js"
import { authRouter } from "./api/auth/routes.js";
import { userRouter } from "./api/users/routers.js";
import { initCategory, initProduct } from "./api/common/models/products.js";
import { productRouter } from "./api/catalog/routers.js";
import { initCart, initCartItems, initorderItems, initOrders } from "./api/common/models/carts.js";
import { initBankAccount, initPayments, initTransactions, initWebhookEvent } from "./api/common/models/payments.js";
import { paymentRouter } from "./api/payments/routers.js";
import { initDB } from "./main.js";

export const UserModel = initModel(sequelize);
export const OneTimePassword = initOneTImePassword(sequelize);
export const ProfileModel = initProfile(sequelize)
export const ProductModel = initProduct(sequelize)
export const CategoryModel = initCategory(sequelize)
export const CartModel = initCart(sequelize)
export const CartItemsModel = initCartItems(sequelize)
export const BankAccountModel = initBankAccount(sequelize)
export const OrderModel = initOrders(sequelize)
export const OrderItemsModel = initorderItems(sequelize)
export const TransactionsModel = initTransactions(sequelize)
export const PaymentsModel = initPayments(sequelize)
export const WebhookEventModel = initWebhookEvent(sequelize)

import swaggerUi from 'swagger-ui-express';
import fs from 'fs';

const app = express();

const startServer = async () => {
    const PORT = "3000"
    const HOSTNAME = "127.0.0.1"
    const projectName = "Market-API"
    try{
        await initDB(sequelize)
        const swaggerDocument = JSON.parse(fs.readFileSync('./swagger-out.json', 'utf-8'));
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

        app.listen(PORT, HOSTNAME, () => {
            console.log(`${projectName} is listening on http://${HOSTNAME}:${PORT}`)
        })
    }
    catch (err){
        logger.info("Error: "+ err.message)
        process.exit(1)
    }
}

app.use(express.json());
app.use("/api", authRouter)
app.use("/api", userRouter)
app.use("/api", productRouter)
app.use("/api", paymentRouter)


app.get("/server", (req, res) => {

    return res.status(200).json({
        status: true,
        details: "Server is Up and Running"
    })
})

startServer();

