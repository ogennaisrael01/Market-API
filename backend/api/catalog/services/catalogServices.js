import { sequelize } from "../../common/utils/database.js"
import { ProductModel } from "../../../index.js"
import { logger } from "../../common/utils/loggers.js"


export const createCatalog = async ( name, shortDescription, price, availableStock, 
    isAvailable, categoryId, image, ownerId) => {

        try{
            await sequelize.transaction( async () => {
                const nameCapitalized = toTitleCase(name)

                let [newProduct, created] = await ProductModel.findOrCreate({ where: {name: nameCapitalized, categoryId: categoryId, ownerId: ownerId}, 
                    defaults: { name: nameCapitalized, shortDescription, price, availableStock, 
                    categoryId, ownerId, image, isAvailable}})
                
                // update the stock if product already exists
                if (!created) {
                    logger.info("Product found, updating stock")
                    newProduct.availableStock += availableStock
                    await newProduct.save()
                }

            });
            return {status: true, message: "product created"}

        } catch (err) {
            return { status: false, message: err.message}
        }
    }

export const updateStock = async (productId, quantity) => {
    try{
        const product = await ProductModel.findByPk(productId)
        if (!product) {
            return { status: false, message: "Product not found" }
        }
        product.availableStock += quantity
        logger.info("Updating stock for product: " + product.name)
        if (product.availableStock > 0 && !product.isAvailable) {
            product.isAvailable = true
        }
        await product.save()
        logger.info("Stock updated")
        return { status: true, message: "Stock updated" }
    } catch (err) {
        return { status: false, message: err.message }
    }
}


export const toTitleCase = str => {
    return str.toLowerCase().split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
}