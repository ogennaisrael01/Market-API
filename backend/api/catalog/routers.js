import { Router } from "express";
import { check } from "../middlewares/isAuthenticated.js";
import { IsOwner, rolePermissionMiddleware } from "../middlewares/checkPermissions.js";
import { CartModel, OrderModel, ProductModel, UserModel } from "../../index.js";
import { addToCart, cancelOrder, checkOutCart, createCategory, createProduct, deleteProduct, getSingleCartItem, listCartItems, listCategory, listProducts, orderItem, orders, removeFromCart, retreiveProduct, retrieveOrder, updateProduct } from "./controllers.js";
import { UserRole } from "../common/models/Users.js";
import { ProductUserAssociations } from "../common/models/association.js";
import { isVendor, isCustomer } from "../common/utils/role_check.js";

export const productRouter = Router();


const isProductOwner = IsOwner( async (req) => {
    // middleware allowing only instance owner to modify it
    const { id } = req.params || req.query

    if (!id) {
        throw new Error("product id must be present")
    }
    const product = await ProductModel.findByPk(id)
    if (!product){
        throw new Error("Product is not present in the DB")
    }
    return product
})

const isCartOwner = IsOwner( async (req) => {
    const userId = req.user.userId
    try{
        const cart = await CartModel.findOne({
            where: { ownerId: userId }
        })
        
        if (!cart){
            throw new Error("Cart not found")
        }
        return cart
    }
    catch (err) {
        throw new Error(err.message)
    }
})

const isOrderOwner = IsOwner(async (req) => {
    const {orderId} = req.params || req.query

    if(!orderId){
        throw new Error("order id must be present")
    }
    const order = OrderModel.findByPk(orderId)

    if (!order){
        throw new Error("order not found")
    }
    return order
})


productRouter.post("/products", check, isVendor, createProduct) // be be vendor and must be authenticated
productRouter.get("/products", listProducts) // no restrrictions 
productRouter.get("/products/:id", check, retreiveProduct) // must be authenticated
productRouter.patch("/products/:id", check, isProductOwner, updateProduct) // update: only owner can modify
productRouter.delete("/products/:id", check, isProductOwner, deleteProduct) // delete: only owners can modify

// cart managements
productRouter.post("/carts-add", check, addToCart) // add items to carts. must be authenticated
productRouter.delete("/carts-remove", check, isCartOwner, removeFromCart) // remove items from cart. must be and authenticated and must be the cart owner
productRouter.get('/cart', check, isCartOwner, listCartItems) // list cart items. cart owner can only view their own cart
productRouter.get("/cart/:cartItemId", check, isCartOwner, getSingleCartItem)

// category managements
productRouter.post("/category", createCategory)
productRouter.get("/category", listCategory)


//orders managements
productRouter.post("/check-out", check, isCustomer, checkOutCart)
productRouter.get("/orders", check, orders)
productRouter.get("/orders/:orderId", check, isOrderOwner, retrieveOrder)
productRouter.patch("/orders/:orderId/cancel", check, isOrderOwner, cancelOrder)
productRouter.get("/orders/:orderId/item/:orderItemId", check, isOrderOwner, orderItem)