import { fullName } from "../common/models/Users.js"

export const userSerializer = userData => {
    // return a dict of serialized user data
    return {
        userId: userData.userId,
        email: userData.email,
        fullName: fullName(userData),
        userName: userData.username,
        createdAt: userData.createdAt,
        role: userData.role,
        isVerified: userData.isVerified
    }
}


export const profileSerializer = profileData => {
    return {
        profileId: profileData.profileId,
        ownerId: profileData.ownerId,
        age: profileData.age,
        location: profileData.location,
        country: profileData.country,
        profilePicture: profileData.profilePicture

    }
}