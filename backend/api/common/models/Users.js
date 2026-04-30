
import { DataTypes } from "sequelize";

export const UserRole = {
    Vendor: "VENDOR",
    Customer: "CUSTOMER"
}

const UserModel = {
    userId: { type: DataTypes.UUID, primaryKey: true, 
            defaultValue: DataTypes.UUIDV4, unique: true},

    email: { type: DataTypes.STRING, unique: true, allowNull: false},
    firstName: { type: DataTypes.STRING, allowNull: true},
    lastName: { type: DataTypes.STRING, allowNull: true},

    username: { type: DataTypes.STRING, allowNull: true},
    phone: { type: DataTypes.CHAR, allowNull: false},
    password: { type: DataTypes.CHAR, allowNull: false},
    role: { type: DataTypes.STRING, allowNull: true, defaultValue: null},

    // account status
    isActive: { type: DataTypes.BOOLEAN, defaultValue: false},
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false}

}

const ProfileModel = {
    profileId: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, unique: true},
    ownerId: { type: DataTypes.UUID, unique: true},

    age: { type: DataTypes.STRING, allowNull: true},
    location: { type: DataTypes.STRING, allowNull: true},
    country: { type: DataTypes.STRING, allowNull: true},

    profilePicture: {type: DataTypes.STRING, allowNull: true}
}

export const fullName = userData => {
    return `${userData.firstName} ${userData.lastName}`??userData.username
}

export const initProfile  = sequelize => sequelize.define('profiles', ProfileModel)
export const initModel = sequelize => sequelize.define("users", UserModel)