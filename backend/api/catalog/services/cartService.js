import { Op } from "sequelize"
import { CartItemsModel, OrderItemsModel, OrderModel, ProductModel, CartModel, UserModel } from "../../../index.js"
import { sequelize } from "../../common/utils/database.js"
import { logger } from "../../common/utils/loggers.js"
import { updateStock } from "./catalogServices.js"
import { orderStatus } from "../../common/models/carts.js"

export const saveCartItems = async (quantity, product, cart ) => {
    try{
        const availableStock = product.availableStock

        if ( quantity > availableStock){
            return { status: false, message: "Out of stock. Stocks available = "+ availableStock}
        }
        await sequelize.transaction( async () => {

            const [cartItem, created] = await CartItemsModel.findOrCreate({
                where: { cartId: cart.cartId, productId: product.productId},
                defaults: {
                    quantity: quantity
                }
            })

            if (!created) {
                cartItem.quantity += quantity
                await cartItem.save()
            }
            logger.info("cart items saved")
            
        })
        return { status: true, message: "created"}

    }
    catch (err){
        logger.info("failed to create cart items")
        return { status: false, message: err.message}
    }

} 

export const removeCartItems = async (quantity, cart, productId) => {

    try {

        let cartItem = await CartItemsModel.findOne({
            where: { cartId: cart.cartId, productId: productId},
            attributes: ['quantity', "cartItemsId"]
        })

        if(!cartItem){
            return { status: false, message: "cartItems not found"}
        }

        const cartItemQuatity = cartItem.quantity

        if ( quantity < cartItemQuatity){
            logger.info("decreasing cartItem quantity")
            cartItem.quantity -= quantity
            await cartItem.save()
        }
        else {
            // apply with caution, cannot undo
            logger.info("deleting this instance")
            await cartItem.destroy()
        }

        return { status: true, message: "updated"}
    }
    catch (err) {
        return { status: false, message: err.message}
    }
}

export const listCart = async (userId) => {

    if(!userId) {

        return { status: false, message: "user instance not found"}
    }
    try{
        const cart = await CartModel.findOne({
            where: { ownerId: userId },
            include: [{
                model: CartItemsModel, as: "cartitems", 
                attributes: { exclude: ['productId']},
                include: [{
                    model: ProductModel, as: "product",   
                    required: true
                }],
                order: [[ "createdAt", "DESC" ]]
            }],
        })
    
        if(!cart){
            return {status: false, details: "cart is empty"}
        }
        return {status: true, instance: cart, message: "found"}
    }
    catch (err) {
        return {status: false, message: err.message}
    }
}

export class OrderService {
    constructor(){}

    async cancelOrder(orderId){
        if (!orderId){
            return { status: false, message: "order id must be present"}
        }   
        try{
            const orderResult = await this.listOrder(orderId)
            
            if (!orderResult.status){
                return { status: false, message: orderResult.message}
            }
            const order = orderResult.queryset
            if (!order){
                return { status: false, message: "order not found"}
            }       
            if (order.status.trim() === orderStatus.cancelled){
                return { status: false, message: "order is already cancelled"}
            }
            if (order.status.trim() === orderStatus.completed){
                return { status: false, message: "completed order cannot be cancelled"}
            }
            order.status = orderStatus.cancelled
            await order.save()

            // update the stock of the products in the order
            const orderItems = order.orderItems
            for (const item of orderItems){
                const product = item.product
                await updateStock(product.productId, item.quantity)
            }

            return { status: true, message: "order cancelled"}
        }   
        catch (err){
            return { status: false, message: err.message}
        }
    }


    async retrieveOrderItem(orderId, orderItemId){
        if (!orderId || !orderItemId){
            return { status: false, message: "order id and order item id must be present"}
        }   

        try{
            const orderItem = await OrderItemsModel.findOne({
                where: { orderItemsId: orderItemId, orderId: orderId},
                include: [ 
                    { model: ProductModel, as: "product",
                        include: [ 
                            { model: UserModel, as: 'owner', attributes: { exclude: ['password']}}
                        ] 
                    }
                ]
            })
            return { status: true, message: "found", queryset: orderItem}
        }
        catch (err){
            return { status: false, message: err.message}
        }
    }

    async listOrders(userId, status, offset, limit, extraQuery) {
        if (!userId){
            return { status: false, message: "user Id must be present"}
        }

        try{

            const queryBuilder = { where: { ownerId: userId},
                include: [
                    { model: OrderItemsModel, as: "orderItems", 
                        include: [
                            { model: ProductModel, as: "product",
                                include: [ 
                                    { model: UserModel, as: 'owner', attributes: { exclude: ['password']}}
                                ] 
                            }
                        ]
                    }
                ]
            }

            if (status){
                queryBuilder.where.status = { [Op.iLike]: `%${status}%`}
            }   
            if (extraQuery){
                queryBuilder.where = { ...queryBuilder.where, ...extraQuery}
            }

            queryBuilder.limit = limit
            queryBuilder.offset = offset
            
            console.log(queryBuilder)
            const { rows, count } = await OrderModel.findAndCountAll(queryBuilder)
            return { status: true, message: "found", details: rows, count: count}

        }
        catch (err){
            return { status: false, message: err.message}
        }
    }

    async listOrder(orderId){
        if(!orderId){
            return { status: false, message: "order Id must be present"}
        }
        try{

            const order = await OrderModel.findByPk(orderId, {
                include: [
                    { 
                        model: OrderItemsModel, as: "orderItems", 
                        include: [ 
                            { 
                                model: ProductModel, as: "product", 
                                include: [ 
                                    { 
                                        model: UserModel, as: 'owner', 
                                        attributes: { exclude: ['password']}
                                    }
                                ] 
                            }
                        ]
                    }
                ]
            })

            if (!order){
                return {status: false , message: "order not found"}
            }

            return {status: true, message: "found", queryset: order}
        }
        catch (err){
            return {status: false, message: err.message}
        }
    }

    async createOrder(ownerId) {
        if (!ownerId){
            return {status: false, message: "Owner must be present in order management"}
        }
        try{
            const order = await OrderModel.create({ ownerId: ownerId})
            return { status: true, instance: order, message: "created"}
        } catch (err){
            return { status: false, message: err.message}
        }
    }

    async createOrderItems(orderId, productId, quantity){

        try{
            const orderItem = await OrderItemsModel.create({
                    orderId: orderId,
                    productId: productId,
                    quantity: quantity
                })
            
            return { status: true, message: "created", instance: orderItem}

        } catch (err) {
            return { status: false, message: err.message}
        }
    }

    static async totalAmount( orderItems ) {
        // must be an array of order items
        if (!Array.isArray(orderItems)){
            return { status: false, message: 'not a valid array instance'}
        }

        try{
            const total = await orderItems.reduce( async (provious, item) => {
                const sum = await provious;
                const product = await ProductModel.findByPk(item.productId);

                const total = sum + ( product.price * item.quantity)
                return total

            }, Promise.resolve(0))

            return { status: true, total: total, message: "fetched"}

        }
        catch (err){
            return {staus: false, message: err.message}
        }
    }

    static async platFormTotalFee( orderItems ) {

        if (!Array.isArray(orderItems)){
            return { status: false, message: "order items must be an array"}
        }
        try{
            const totalFee = await orderItems.reduce( async (previous, currentItem) => {
                const sum = await previous
                const product = await ProductModel.findByPk(currentItem.productId)
                const onePercentOfPrice = process.env.PLATFORM_PERCENT / 100 * product.price 
                const total = onePercentOfPrice * currentItem.quantity
                return sum + total

            }, Promise.resolve(0))

            return { status: true, total: totalFee, message: "created"}
        }
        catch (err){
            return {status: false, message: err.message}
        }
    }

}

export class CheckOut{
    constructor( cartItems){
        this.cartItems = cartItems
    }

    async checkOutItems(ownerId) {
        if (!this.cartItems){
            return { status: false, message: "cartItems cannot be empty"}
        }
        
        try{
            // create order 
            const service = new OrderService()
            const order = await service.createOrder(ownerId)
            if (!order.status){
                return { status: false, message: order.message}
            }

            for (const item of this.cartItems){
                // make a copy of the items and add it to order items
                let product = item.product
                const orderItem = await service.createOrderItems(order.instance.orderId, 
                                    product.productId, item.quantity)
                try{
                    product.availableStock -= item.quantity
                    if  (product.availableStock < 1){
                        product.isAvailable = false
                        product.availableStock = 0
                    }

                    await product.save()
                }
                catch (err){
                    throw new Error("failed to update product stock: "+ err.message)
                }
                
                if (!orderItem.status){
                    return { status: false, message: orderItem.message}
                }
            }
            return { status: true, message: "created", orderId: order.instance.orderId}
        } catch (err){
            return { status: false, message: err.message}
        }

    }


    async clearCart(userId) {
        try{

            const cart = await CartModel.findOne({ where: { ownerId: userId}})
            if (!cart){
                return { status: false, message: "cart not found"}
            }   

            await CartItemsModel.destroy({ where: { cartId: cart.cartId}})
            return { status: true, message: "cart cleared"}
        }
        catch (err){
            return { status: false, message: err.message}
        }
    }


}