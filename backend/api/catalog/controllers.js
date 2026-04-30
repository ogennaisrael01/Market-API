
import { request } from "express";
import { CartItemsModel, CartModel, CategoryModel, OrderItemsModel, OrderModel, ProductModel, UserModel } from "../../index.js"
import { validateCartSchema, validateCategory, validateProductSchema } from "../common/utils/ajv_validations.js"
import { badRequest, notFound, ok, serverError } from "../common/utils/handlers.js"
import { categorySerializer, productSerializer } from "../serializers/catalog.js"
import { createCatalog, toTitleCase } from "./services/catalogServices.js";
import { ExclusionConstraintError, Op, where } from "sequelize";
import { CheckOut, listCart, OrderService, removeCartItems, saveCartItems } from "./services/cartService.js";
import { orderItemsOrderAssociation } from "../common/models/association.js";
import { orderStatus } from "../common/models/carts.js";
import { sequelize } from "../common/utils/database.js";
import { logger } from "../common/utils/loggers.js";

export const createCategory  = async (req, res) => {    
    const categoryData = req.body
    const isValidObject = validateCategory(categoryData)
    if (!isValidObject){
        return badRequest(res, { status: false, details: validateCategory.errors})
    }
    // create
    const { name } = categoryData
    const nameCapitalized =  toTitleCase(name)
    try{
        const [ category, created ] = await CategoryModel.findOrCreate({ where: { name: nameCapitalized},
                                defaults: {
                                    name: nameCapitalized
        }})
        return ok(res, {status: true, details: categorySerializer(category)})
    }
    catch (err){
        return serverError(res, { status: false, details: err.message})
    }
    
}

export const listCategory = async (req, res) => {

    if ( "name" in req.query){
        const searchField = req.query.name
        console.log("Here")
        const queryset = CategoryModel.findAll( { 
            where: { name: { [Op.like]: `%${searchField}%`}}, 
            order: [[ "name", 'DESC']]
        })

        return ok(res, { status: true, details: JSON.stringify(queryset) ?? null})

    }
    const queryset = CategoryModel.findAll({
        order: [['name', "DESC"]]
    })
    return ok(res, { status: true, details: JSON.stringify(queryset) ?? null})
}

export const createProduct = async (req, res) => {
    const productData = req.body

    const isValid = validateProductSchema(productData)
    if (!isValid){
        return badRequest(res, { status: false, details: validateProductSchema.errors})
    }

    const { name, shortDescription, price, availableStock, isAvailable, image, categoryId } = productData

    // validate category( check if category exists)
    const category = CategoryModel.findByPk(categoryId.trim())
    if(!category){
        return badRequest(res, { status: false, details: "Category field is invalid. object not found"})
    }
    const currentUserID = req.user.userId

    const newProduct = await createCatalog(
        name, shortDescription, price, availableStock, isAvailable, categoryId.trim(), image, currentUserID
    )
    console.log(newProduct)

    if (!newProduct.status){
        return badRequest(res, { status: false, details: newProduct.message})
    }

    return ok(res, {status: true, details: newProduct})
}

export const listProducts = async (req, res) => {

    const { page=1, limit=10, search, category, minPrice, maxPrice} = req.query

    const parsedLimit = parseInt(limit)
    const parsedoffset = (parseInt(page) - 1) * parsedLimit

    const queryBuilder = {
        where: {},
        include: [ {
            model: CategoryModel, as: "categories",
            where: {},
            required: !!category
        }],
        order: [[ "createdAt", "DESC" ]],
        limit: parsedLimit || 10,
        offset: parsedoffset || 0
    }

    try{
        if (search) {
            queryBuilder.where.name = { [Op.iLike]: `%${search}%`}
        }
        if (category) {
            queryBuilder.include[0].where.name = { [Op.iLike]: `%${category}%`}
        }

        if ( minPrice || maxPrice) {
            queryBuilder.where.price = {
                ...(maxPrice && { [Op.lte]: maxPrice}),
                ...(minPrice && { [Op.gte]: minPrice})
            }
        }

        const { rows , count } = await ProductModel.findAndCountAll(queryBuilder)

        const totalPages = Math.ceil(count / parsedLimit)
        const response = {
            status: true,
            count: count,
            totalPages: totalPages,
            currentPage: parseInt(page) || 1,
            isNextPage: totalPages > parseInt(page),
            isPreviousPage: parseInt(page) > 1,
            data: rows

        }
        return ok(res, {details: response})
    }
    catch (err){

        return serverError(res, {status: false, details: err.message})
    }
}

export const retreiveProduct = async (req, res) => {
    const { id } = req.params

    try{
        const product = await ProductModel.findByPk(id, { include: [
            { model: UserModel, as: "owner", attributes: { exclude: ['password']}}, 
            { model: CategoryModel, as: "categories"}
        ]})

        if (!product) {
            return ok(res, { status: false, details: "product not found "})
        }
        return ok(res, {status: true, details: product})

    } catch (err){
        return serverError(res, {status: false, details: err.message})
    }

}

export const updateProduct = async (req, res) => {

    const { name, categoryId, shortDescription, price, availableStock, isAvailable, image } = req.body
    const { id } = req.params ?? req.query

    try{
        // validate category 
        const category = await CategoryModel.findByPk(categoryId)
        if (!category){
            return badRequest(res, { status: false, details: "category is not present"})
        }

        // update product
        let product = ProductModel.findByPk(id)

        product.set( {
            name: toTitleCase(name) ?? product.name,
            categoryId: categoryId ?? product.categoryId,
            shortDescription: shortDescription ?? product.shortDescription,
            price: price ?? product.price,
            availableStock: availableStock ?? product.availableStock,
            image: image ?? product.image,
            isAvailable: isAvailable ?? product.isAvailable
        })
        await product.save()
    }
    catch (err) {
        return serverError(res, { status: false, details: err.message})
    }

    // return updated product 
    const updatedProduct = await ProductModel.findByPk(id)

    return ok(res, { status: true, details: productSerializer(updatedProduct)})
}

export const deleteProduct = async (req, res) => {
    try{
        // this delete cannot be undone, so delete with caution

        const { id } = req?.params 
        
        const productToDelete = await ProductModel.destroy({ 
            where: { productId: id}
        })

        if ( productToDelete === 0){
            return badRequest(res, { status: false, details: "failed to delete"})
        }

        return res.status(204)
    }catch (err) {
        return serverError(res, { status: false, details: err.message})
    }
}

export const addToCart = async (req, res) => {

    const cartData = req.body

    const isValid = validateCartSchema(cartData)
    if (!isValid){
        return badRequest(res, { status: false, details: validateCartSchema.errors})
    }

    const { quantity, productId } = cartData
    const currentUserId = req.user.userId

    const [cart, created] = await CartModel.findOrCreate({
        where: { ownerId: currentUserId }
    })

    if (!created ){
        logger.info("cart found for user: "+ currentUserId)
    }
    logger.info("created new cart for user: "+ currentUserId)

    const product = await ProductModel.findByPk(productId, { where: { isAvailable: true }})
    if (!product){
        return notFound(res, { status: false, details: "product with this id cannot be referenced"})
    }
    const cartItems = await saveCartItems(quantity, product, cart)

    if (!cartItems.status){
        return badRequest(res, { status: false, details: cartItems.message})
    }

    return ok(res, {status: cartItems.status, details: cartItems})
}

export const removeFromCart = async ( req, res) => {

    const requestData = req.body

    const isValid = validateCartSchema(requestData)
    if (!isValid){
        return badRequest(res, { status: false, details: validateCartSchema.errors});
    }

    const { quantity, productId } = requestData
    const currentUserId = req.user.userId

    const cart = await CartModel.findOne({
                where: { ownerId: currentUserId }
        })

    if (!cart){
        return badRequest(res, { status: false, details: "NO cart is associated to this account "})
    }

    const remove = await removeCartItems(quantity, cart, productId)

    console.log(remove)

    if(!remove.status){
        return serverError(res, {status: false, details: remove.message})
    }
    return ok(res, {status: true, details: `${quantity} quantities of product ${productId} removed`})
}

export const listCartItems = async (req, res) => {

    const currentUserId = req.user.userId

    try{
        const cart = await listCart(currentUserId)
        if (!cart.status){
            return badRequest(res, {status: false, details: cart.message})
        }
        return ok(res, {status: true, details: cart.instance})
    }
    catch (err) {
        return serverError(res, { status: false, details: err.message})
    }
}

export const getSingleCartItem = async (req, res) => {

    const { cartItemId } = req.params ?? req.query

    try{
        const cartItem = await CartItemsModel.findByPk(cartItemId)

        if (!cartItem){
            return notFound(res, { status: false, details: "item not found"})
        }

        return ok(res, {status: true, details: cartItem})
    }
    catch (err){
        return serverError(res, {status: false, details: err.message})
    }
}

export const checkOutCart = async(req, res) => {

    const currentUserId = req.user.userId

    const cart = await listCart(currentUserId)
    if (!cart.status){
        return badRequest(res, {status: false, message: cart.message})
    }
    const cartItems = cart.instance.cartitems

    const checkOutService = new CheckOut(cartItems)
    const checkOut = await checkOutService.checkOutItems(currentUserId)
    if (!checkOut.status){
        return badRequest(res, { status: false, details: checkOut.message})
    }

    // return user order
    const orderService = new OrderService()
    const order = await orderService.listOrder(checkOut.orderId)

    if(!order.status){
        return badRequest(res, {status: false, details: order.message})
    }

    //clear cart after successful order placement
    try{
        const clear = await checkOutService.clearCart(currentUserId)
        if (!clear.status){
            logger.error("failed to clear cart for user "+ currentUserId + " after successful order placement. error: "+ clear.message)
        }
    }
    catch (err){
        logger.error("failed to clear cart for user "+ currentUserId + " after successful order placement. error: "+ err.message)
    }

    return ok(res, { status: true, details: order.queryset})

}

export const orders = async (req, res) => {
    // fetch orders for the current user with proper pagination
    const { status, page=1, limit=10 } = req.query

    const parsedLimit = parseInt(limit)
    const offSet = (parseInt(page) - 1) * parsedLimit

    try{
        const orderService = new OrderService()
        const orders = await orderService.listOrders(req.user.userId, status, offSet, parsedLimit)

        if (!orders.status){
            return badRequest(res, {status: false, details: orders.message})
        }

        const queryset = orders.details
        const count = orders.count
        const totalPages = Math.ceil(count / parsedLimit)
        const prepResponse = {
            status: true,
            details: queryset,
            count: count,
            totalPages: totalPages,
            currentPage: parseInt(page),
        }
        return ok(res, prepResponse)
    }
    catch (err){
        return badRequest(res, {status: false, details: err.message})
    }
 }

 export const retrieveOrder = async (req, res) => {

    const { orderId } = req.params

    if (!orderId) {
        return notFound(res, {status: false, details: "order id must be present"})
    }

    try{
        const orderService = new OrderService()

        const orderResponse = await orderService.listOrder(orderId)
        
        if (!orderResponse.status){
            return badRequest(res, {status: false, details: orderResponse.message})
        }

        const order = orderResponse.queryset

        const totalAmount = await OrderService.totalAmount(order.orderItems)
        console.log(totalAmount)
        if (!totalAmount.status){
            return badRequest(res, {status: false, details: totalAmount.message})
        }

        return ok(res, {status: true, totalAmount: totalAmount.total, details: order})

    }
    catch (err){
        return badRequest(res, {status: false, details: err.message})
    }
 }

export const orderItem = async (req, res) => {

    const { orderId, orderItemId } = req.params

    console.log(req.params)

    if (!orderId || !orderItemId) {
        return badRequest(res, {status: false, details: "order id and item id must be present"})
    }
    try{
        const orderService = new OrderService()
        const orderItemResponse = await orderService.retrieveOrderItem(orderId, orderItemId)
        if (!orderItemResponse.status) {
            return notFound(res, {status: false, details: orderItemResponse.message})
        }
        return ok(res, { status: true, details: orderItemResponse.queryset})
    }
    catch (err){
        return serverError(res, {status: false, details: err.message})
    }
}

export const cancelOrder = async (req, res) => {

    const { orderId } = req.params
    if (!orderId ){
        return badRequest(res, {status: false, details: "order is must be present"})
    } 
    try{
        const orderService = new OrderService()
        const cancelResponse = await orderService.cancelOrder(orderId)
        if (!cancelResponse.status){
            return badRequest(res, {status: false, details: cancelResponse.message})
        }
        
        return ok(res, cancelResponse)
    }
    catch (err){
        return serverError(res, {status: false, details: err.message})
    }
}
