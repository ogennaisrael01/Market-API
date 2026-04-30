import { config } from "dotenv";
config();

import { Sequelize } from "sequelize";
import { createNamespace } from "cls-hooked";

const nameSpace = createNamespace("api-namespace")

Sequelize.useCLS(nameSpace)
 
const postgresDatabase = process.env.POSTGRES_DATABASE
const postgresUsername = process.env.POSTGRES_USERNAME
const postgresPassword = process.env.POSTGRES_PASSWORD


export const sequelize = new Sequelize( postgresDatabase, postgresUsername, postgresPassword, {
    "dialect": "postgres",
    // "storage": "./storage/market-place.db"
    "host": "localhost",
    'logging': false
});