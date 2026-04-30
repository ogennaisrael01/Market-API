
import { DataTypes, SequelizeScopeError } from "sequelize";
import { defaultValueSchemable } from "sequelize/lib/utils";

const Cart = {
    cartId: { type: DataTypes.UUID, primaryKey: true, unique: true, defaultValue:DataTypes.UUIDV4},
    ownerId: { type: DataTypes.UUID, allowNull: false},
}

const CartItems = { 
    cartItemsId: { type: DataTypes.UUID, primaryKey: true, unique: true, defaultValue: DataTypes.UUIDV4},
    cartId: { type: DataTypes.UUID, allowNull: false},
    productId: { type: DataTypes.UUID, allowNull: false},

    quantity: { type: DataTypes.INTEGER, defaultValue: 0},

}


export const orderStatus = {
    pending: "PENDING",
    cancelled: "CANCELLED",
    completed: "COMPLETED"
}

const Orders = {
    orderId: { type: DataTypes.UUID, primaryKey: true, unique: true, defaultValue: DataTypes.UUIDV4},
    ownerId: { type: DataTypes.UUID, allowNull: false},

    status: { type: DataTypes.STRING, defaultValue: orderStatus.pending},

}

const OrderItems = {
    orderItemsId: { type: DataTypes.UUID, primaryKey: true, unique: true, defaultValue: DataTypes.UUIDV4},

    orderId: { type: DataTypes.UUID, allowNull: false},
    productId: {type: DataTypes.UUID, allowNull: false},

    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0}
}

export const initOrders = sequelize => {
    return sequelize.define("Orders", Orders)
}

export const initorderItems = sequelize => {
    return sequelize.define("orderItems", OrderItems)
}

export const initCart = sequelize => {
    return sequelize.define("Carts", Cart)
}

export const initCartItems  = sequelize => {
    return sequelize.define("CartItems", CartItems)
}