import { ProfileModel } from "../../../index.js"
import { sequelize } from "../../common/utils/database.js"
import { logger } from "../../common/utils/loggers.js"


export const createProfile = async (userId) => {
    logger.info("creating user profile")

    try{
        await sequelize.transaction( async () => {
            const newProfile = await ProfileModel.create({ownerId: userId})

            logger.info("profile created")
            
        })
        return { status: true, message: "profile created"}
        
    }catch (err){
        logger.warn("failed to create profile: "+ err.message)
        return { status: false, message: err.message}
    }
}