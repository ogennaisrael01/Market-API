
const responseHandler = (statusCode) => (res, data) => {
    return res.status(statusCode).json(data)
} 

export const ok = responseHandler(200)
export const created = responseHandler(201)
export const permissionDenied = responseHandler(403)
export const notFound = responseHandler(404)
export const badRequest = responseHandler(400)
export const notAutheenticated = responseHandler(401)
export const serverError = responseHandler(500)


