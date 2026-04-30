
import {Ajv} from "ajv";
import addFormat from "ajv-formats";

const ajv = new Ajv();
addFormat(ajv)

const userRegSchema = {
    type: "object",
    required: ['email', 'username', 'password', 'phone'],
    properties: {
        email: { type: "string", minLength: 8, format: "email"},
        username: { type: "string", minLength: 5},
        password: { type: 'string', minLength: 8},
        phone: { type: "string", minLength: 11}
    },
    additionalProperties: true
}

const accountVerificationSchema = {
    type: "object",
    required: ['code'],
    properties: {
        code:  { type: "string", minLength: 6},
    }
}

const resendCodeVerificationSchema = {
    type: "object",
    required: ['email'],
    properties: {
        email: { type: "string", minLength: 8, format: "email"}
    }
}

const loginSchema = {
    type: "object",
    required: ['email', 'password'],
    properties: {
        email: {type: "string", minLength: 8, format: "email"},
        password: {type: "string", minLength: 6}
    }
}

const onboardSchema = {
    type: 'object',
    required: ['role'],
    properties: {
        role: { type: "string"}
    }
}

const passwordChangeConfirmSchema = {
    type: "object",
    required: ['code', "newPassword", "confirmPassword"],
    properties: {

        code: { type: 'string', minLength: 6},
        newPassword: { type: "string", minLength: 8},
        confirmPassword: {type: "string", minLength: 8}
    }
}

export const validateConfirmPasswordChange = ajv.compile(passwordChangeConfirmSchema)
export const validateVerification = ajv.compile(accountVerificationSchema)
export const validateUserReg = ajv.compile(userRegSchema)
export const validateResendCode = ajv.compile(resendCodeVerificationSchema)
export const validateLogin = ajv.compile(loginSchema)
export const validateOnboard = ajv.compile(onboardSchema)

//------------------------------------------------------------------

// Catalog

const ProductCreateSchema = {
    type: "object",
    required: ["name", "categoryId", "shortDescription", 'price', 'availableStock', "isAvailable", "image"],

    properties: {
        name: { type: "string", minLength: 5},
        categoryId: { type: "string", format: "uuid"},
        price: { type: "integer"},
        isAvailable: { type: "boolean"},
        image: { type: "array"},
        shortDescription: {type: "string", minLength: 10, maxLength: 255},
        availableStock: { type: "integer"}
    }
}

const CategorySchema = {
    type: "object",
    required: ['name'],
    properties: {
        name: { type: "string", minLength: 5}
    }
}

const CartSchema = {
    type: "object",
    required: ["quantity", "productId"],
    properties: {
        quantity: { type: "integer"},
        productId: { type: "string", format: "uuid"}
    }
}

export const validateCartSchema = ajv.compile(CartSchema)
export const validateProductSchema = ajv.compile(ProductCreateSchema)
export const validateCategory = ajv.compile(CategorySchema)



// Payment Validation

const bankAccountSchema = {
    type: "object",
    required: ["accountNumber", 'bankCode'],
    properties: {
        accountNumber: {type: "string", maxLength: 10},
        bankCode: { type: "string"}
    }
}

export const validateBankAccount = ajv.compile(bankAccountSchema)