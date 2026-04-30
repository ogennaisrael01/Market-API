
import { rolePermissionMiddleware } from "../../middlewares/checkPermissions.js";
import { UserRole } from "../models/Users.js";


export const isVendor = rolePermissionMiddleware(UserRole.Vendor)
export const isCustomer = rolePermissionMiddleware(UserRole.Customer)
export const isAdmin = rolePermissionMiddleware("admin")

