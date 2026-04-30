
import { UserModel, OneTimePassword, 
        ProfileModel, CategoryModel, 
        ProductModel, CartModel, 
        CartItemsModel,
        BankAccountModel,
        OrderModel, PaymentsModel, 
        TransactionsModel,
        OrderItemsModel} from "../../../index.js"
import { UserRole } from "./Users.js"


export const UserOTPAssociation = () => {

    UserModel.hasMany(OneTimePassword, { foreignKey: "ownerId", as: "passwords"})
    OneTimePassword.belongsTo(UserModel, { foreignKey: "ownerId", as: "owner"})
}

export const UserProfileAssociation  = () => {
    UserModel.hasOne(ProfileModel, {foreignKey: "ownerId", as: "profile"})
    ProfileModel.belongsTo(UserModel, {foreignKey: "ownerId", as: "owner"})
}

export const ProductCategoryAssociations = () => {
    CategoryModel.hasMany(ProductModel, { foreignKey: "categoryId", as: "products"})
    ProductModel.belongsTo(CategoryModel, { foreignKey: "categoryId", as: "categories"})
}

export const ProductUserAssociations = () => {
    UserModel.hasMany(ProductModel, {foreignKey: "ownerId", as: "products"})
    ProductModel.belongsTo(UserModel, {foreignKey: "ownerId", as: "owner"})
}

export const CartUserAssociations = () => {
    UserModel.hasOne(CartModel, { foreignKey: "ownerId", as: "cart"})
    CartModel.belongsTo(UserModel, { foreignKey: "ownerId", as: "owner"})
}

export const CartItemCartAssociation = () => {

    CartModel.hasMany(CartItemsModel, { foreignKey: "cartId", as: "cartitems"}),
    CartItemsModel.belongsTo(CartModel, { foreignKey: "cartId", as: "cart"})
}

export const CartItemsProductAssociation = () => {

    ProductModel.hasMany(CartItemsModel,  { foreignKey: "productId", as: "cartItems"})
    CartItemsModel.belongsTo(ProductModel, {foreignKey: "productId", as: "product"})
}

export const bankOwnerAssociation = () => {

    UserModel.hasOne(BankAccountModel, { foreignKey: "ownerId", as: "bankAccount"})
    BankAccountModel.belongsTo(UserModel, { foreignKey: "ownerId", as: "owner"})
}

export const orderOwnerAssociation = () => {
    UserModel.hasMany(OrderModel, { foreignKey: "ownerId", as: "orders"})
    OrderModel.belongsTo(UserModel, { foreignKey: "ownerId", as: "owner"})
}

export const orderItemsOrderAssociation = () => {
    OrderModel.hasMany(OrderItemsModel, { foreignKey: "orderId", as: "orderItems"})
    OrderItemsModel.belongsTo(OrderModel, {foreignKey: "orderId", as: "order"})
}

export const orderItemsProductAssocaition = () => {
    ProductModel.hasMany(OrderItemsModel, {foreignKey: "productId", as: "orderItems"})
    OrderItemsModel.belongsTo(ProductModel, {foreignKey: "productId", as: "product"})
}

export const paymentsUserAssociation = () => {
    UserModel.hasMany(PaymentsModel, { foreignKey: 'ownerId', as: "payments"})
    PaymentsModel.belongsTo(UserModel, { foreignKey: "ownerId", as: "owner"})
}

export const PaymentsOrderAssociation = () => {
    OrderModel.hasOne(PaymentsModel, {foreignKey: "orderId", as: "payment"})
    PaymentsModel.belongsTo(OrderModel, { foreignKey: "orderId", as: "order"})
}

export const TransactionsUserAssociation = () => {

    UserModel.hasMany(TransactionsModel, {foreignKey: "ownerId", as: "transactions"})
    TransactionsModel.belongsTo(UserModel, { foreignKey: "ownerId", as: "owner"})
}