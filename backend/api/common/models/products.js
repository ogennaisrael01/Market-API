import { DataTypes } from "sequelize";

const CategoryModel = {
    categoryId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true, primaryKey: true},
    name: { type: DataTypes.STRING, allowNull: false}
}

const productModel = {
    productId: {
        type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, 
        allowNull: false, unique: true, primaryKey: true},

    name: { type: DataTypes.CHAR, allowNull: false},
    shortDescription: { type: DataTypes.STRING, allowNull: true},
    categoryId: {type: DataTypes.UUID, allowNull: false},
    
    ownerId: { type: DataTypes.UUID, allowNull: false },

    price: { type: DataTypes.DECIMAL, allowNull: false},
    availableStock: { type: DataTypes.INTEGER, defaultValue: 0},
    image: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: []},

    // boolean values
    isAvailable: { type: DataTypes.BOOLEAN, defaultValue: true}

}


export const initCategory = sequelize => {
    return sequelize.define("category", CategoryModel)
}

export const initProduct = sequelize => sequelize.define("products", productModel)
