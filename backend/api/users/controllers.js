import { ProfileModel, UserModel } from "../../index.js"
import { sequelize } from "../common/utils/database.js"
import { badRequest, notAutheenticated, ok } from "../common/utils/handlers.js"
import { profileSerializer, userSerializer } from "../serializers/users.js"


export const getProfile = async (req, res) => {
    const currentUser = req.user
    if (!currentUser){
        return notAutheenticated(res, { status: false, details: "not authenticated"})
    }

    const userData = await UserModel.findByPk(currentUser.userId, { include: [{model: ProfileModel, as: "profile"}] })
    if (!userData){
        return badRequest(res, {status: false, details: "profile not found"})
    }
    return ok(res, {status: true, details: { user: userSerializer(userData), 
                                        profile: profileSerializer(userData.profile ?? "null")}})

}

export const profileUpdate = async (req, res) => {
    const profileData = req.body

    const { age, location, country, profilePicture } = profileData
    const currentUser = req.user
    let profile = await ProfileModel.findOne({ where: { ownerId: currentUser.userId }})

    if(!profile){
        return badRequest(res, { status: false, details: "Profile not found"})
    }
    try{

        await sequelize.transaction( async () => {
            profile.set({
                age: age ?? profile.age,
                location: location ?? profile.location,
                country: country ?? profile.country,
                profilePicture: profilePicture ?? profile.profilePicture
            })

            await profile.save()
        })

    } catch (err) {
        return badRequest(res, {status: false, details: err.message})
    }

    const updatedProfile = ProfileModel.findOne({ where: { profileId: profile.profileId}})

    return ok(res, {status: true, details: profileSerializer(updatedProfile)})

}

export const profilePublic = async (req, res) => {
    const profileId = req.params.id
    if (!profileId) {
        return badRequest(res, { status: false, details: "profile id must be present "})
    }
    const profile = await ProfileModel.findByPk(profileId)
    if (!profile){
        return badRequest(res, { status: false, details: "profile not found"})
    }

    return ok(res, { status: true, details: profileSerializer(profile)})
}