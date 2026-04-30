
import { fullName } from "../../common/models/Users.js";

export const loginOutSerializer = (userInstance, accessToken) => {
    return {
        userId: userInstance.userId,
        fullName: fullName(userInstance),
        activeRole: userInstance.role,
        accessToken: accessToken
    }
}