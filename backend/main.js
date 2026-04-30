
import { bankOwnerAssociation, CartItemCartAssociation, CartItemsProductAssociation, 
    CartUserAssociations, orderItemsOrderAssociation, orderItemsProductAssocaition, orderOwnerAssociation, PaymentsOrderAssociation, paymentsUserAssociation, ProductCategoryAssociations, ProductUserAssociations, 
    TransactionsUserAssociation, 
    UserOTPAssociation, UserProfileAssociation } from "./api/common/models/association.js";

import { logger } from "./api/common/utils/loggers.js";

export const initDB = async (sequelize) => {

    try{
        UserOTPAssociation();
        UserProfileAssociation();
        ProductCategoryAssociations();
        ProductUserAssociations();
        CartItemCartAssociation();
        CartItemsProductAssociation();
        CartUserAssociations();
        bankOwnerAssociation();
        orderOwnerAssociation();
        orderItemsOrderAssociation();
        orderItemsProductAssocaition();
        paymentsUserAssociation();
        PaymentsOrderAssociation();
        TransactionsUserAssociation();

        await sequelize.sync({ alter: true});
        logger.info("Database connection sync successfully")
        
    }
      catch (err) {
            logger.error("Failed to sync database connection", {
                error: err.message})
            process.exit(1)
      }
         
}