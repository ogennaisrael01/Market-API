import { DataTypes} from "sequelize";

const OneTimePassword = {

    otpId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, unique: true},
    rawCode: {type: DataTypes.CHAR, unique: true, allowNull:false},
    hashCode: { type: DataTypes.CHAR, unique: true, allowNull: false},

    ownerId: { type: DataTypes.UUID, allowNull: false},

    isUsed:{ type: DataTypes.BOOLEAN, defaultValue: false},
}

export const initOneTImePassword = (sequelize) => sequelize.define("OneTimePassword", OneTimePassword)


export const isExpired = (otpInstance, expiresIn) => {
    const expiryTime =  new Date(otpInstance.createdAt)
    expiryTime.setMinutes(expiryTime.getMinutes() + expiresIn)

    const currentDate = new Date();

    return currentDate > expiryTime
}

export const isUsed = (otpInstance) => otpInstance.isUsed