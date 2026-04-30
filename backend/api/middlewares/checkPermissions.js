
import { UserModel } from "../../index.js"
import { badRequest, permissionDenied, serverError } from "../common/utils/handlers.js"

export const rolePermissionMiddleware = userRole => async (req, res, next) => {
    try {
        const currentUserId = req.user.userId

        const user = await UserModel.findByPk(currentUserId)

        if (!user.role){
            return badRequest(res, {status: false, details: "Complete your registration"})
        }

        if (userRole.trim() !== user.role.trim()){
            return permissionDenied(res, { status: false, details: "You are not permitted to perfrom this action"})
        }
        next();
    } catch (err) {
        return serverError(res, {status: false, details: err.message})
    }
}

export const IsOwner = ( callback ) => async (req, res, next ) => {
    try {
        const instance = await callback(req);

        if (!instance){
            return badRequest(res, { status: false, details: "Missing object to check ownership"})
        }
        if ( instance.ownerId !== req.user.userId) {
            return permissionDenied(res, { status: false, details: "You are not permitted to perform this action"})
        };

        next();
    }

    catch (err) {
        return serverError(res, { status: false, details: err.message} )
    }
}
