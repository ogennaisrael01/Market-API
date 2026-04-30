


export const productSerializer = productData => {
    return {
        productId: productData.productId,
        name: productData.name,
        shortDescription: productData.shortDescription,
        price: productData.price,
        availableStock: productData.availableStock,
        isAvailable: productData.isAvailable, 
        createdAt: productData.createdAt,
        updatedAt: productData.updatedAt
    }
}

export const categorySerializer = category => {
    return {
        categoryId: category.categoryId,
        name: category.name
    }
}