# Market-API Project Description

## Project Name

**Market-API** — A multi-vendor e-commerce marketplace backend built with Node.js and Express.

## Overview

Market-API is a full-featured backend system that powers a multi-vendor online marketplace. The platform allows vendors to list and sell products while enabling customers to browse, add items to a cart, and complete purchases. It handles user authentication, product management, shopping cart operations, order processing, and integrated payments through Paystack.

The system is designed for two primary user roles: **Vendors** who sell products and **Customers** who purchase them. An admin role exists for approving vendor payouts. The API follows RESTful conventions and includes Swagger documentation for easy exploration.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime for server-side execution |
| **Express** | Web framework for building RESTful APIs |
| **Sequelize** | ORM for database abstraction and model management |
| **PostgreSQL** | Primary relational database (configurable) |
| **SQLite** | Alternative local database option |
| **JSON Web Token (JWT)** | Token-based authentication |
| **bcrypt** | Password hashing for security |
| **Paystack** | Payment gateway integration |
| **Brevo** | Transactional email service |
| **Winston** | Structured logging |
| **AJV** | JSON schema validation for request payloads |
| **Swagger UI** | API documentation interface |
| **dotenv** | Environment variable management |

## System Architecture

```
backend/
├── index.js              # Application entry point, Express server setup
├── main.js               # Database initialization and model associations
├── package.json          # Project dependencies and scripts
├── .env.example          # Environment variable template
│
├── api/
│   ├── auth/             # Authentication module
│   │   ├── routes.js     # Auth endpoints (register, login, verify, password)
│   │   ├── controllers.js # Auth business logic
│   │   ├── services/     # User and OTP creation services
│   │   └── utils/        # JWT, email, serializers
│   │
│   ├── users/            # User profile management
│   │   ├── routers.js    # Profile endpoints
│   │   ├── controllers.js
│   │   └── services/     # Profile creation
│   │
│   ├── catalog/          # Products, categories, cart, orders
│   │   ├── routers.js    # Product, cart, order endpoints
│   │   ├── controllers.js
│   │   └── services/     # Cart and catalog business logic
│   │
│   ├── payments/        # Payment processing and webhooks
│   │   ├── routers.js    # Payment endpoints
│   │   ├── controllers.js
│   │   └── services/     # Paystack, bank accounts, transactions
│   │
│   ├── common/           # Shared utilities and models
│   │   ├── models/       # Database schemas (Users, Products, Carts, Payments)
│   │   └── utils/        # Database, validation, handlers, loggers
│   │
│   ├── middlewares/     # Authentication, permissions, idempotency
│   │   ├── isAuthenticated.js
│   │   ├── checkPermissions.js
│   │   └── IdempotencyMiddleware.js
│   │
│   └── serializers/      # Response data transformation
│
├── logs/                 # Application log files
└── storage/              # Local storage (if using SQLite)
```

## Core Features

### 1. User Authentication & Registration
- **What it does**: Allows new users to register with email, username, phone, and password. Sends a verification OTP to the registered email.
- **How it works**: Users submit registration data → system creates a user record → generates a 6-digit OTP → sends via Brevo email → user verifies by submitting the code → account is marked verified and active.
- **Applies to**: New customers and vendors signing up.

### 2. Email Verification & OTP
- **What it does**: Confirms user identity through one-time passwords sent to their email.
- **How it works**: OTP is generated, hashed with bcrypt for storage, and sent to the user's email. The verification endpoint validates the code and marks the account as verified.
- **Applies to**: All new registered users.

### 3. User Onboarding (Role Assignment)
- **What it does**: Allows authenticated users to select a role (Vendor or Customer) after initial registration.
- **How it works**: Users call the onboard endpoint with a role choice. The system updates their role field in the database.
- **Applies to**: Authenticated users who have completed email verification.

### 4. Product Management
- **What it does**: Enables vendors to create, update, delete, and list products.
- **How it works**: Vendors POST to `/products` with product details. Products are linked to categories and owners. Customers can list all products or search by name, category, or price range.
- **Applies to**: Vendors (create/update/delete), All users (list/search).

### 5. Category Management
- **What it does**: Provides product categorization.
- **How it works**: Categories are created via POST `/category`. Products are associated with categories via categoryId.
- **Applies to**: All users (list), Admins (create).

### 6. Shopping Cart
- **What it does**: Allows customers to add products to a cart, modify quantities, and remove items.
- **How it works**: Each user has one cart. Cart items store productId and quantity. Stock validation prevents adding more than available.
- **Applies to**: Authenticated customers.

### 7. Order Creation & Checkout
- **What it does**: Converts cart contents into an order and initiates payment.
- **How it works**: Customer calls `/check-out` → system creates an Order record → copies cart items to OrderItems → clears cart → returns order for payment.
- **Applies to**: Authenticated customers with items in cart.

### 8. Order Management
- **What it does**: Allows customers to view their orders and cancel pending orders.
- **How it works**: Orders have statuses (PENDING, CANCELLED, COMPLETED). Customers can retrieve their orders or cancel if still pending.
- **Applies to**: Authenticated customers who placed orders.

### 9. Payment Processing
- **What it does**: Integrates with Paystack to process card payments for orders.
- **How it works**: Customer initiates payment via `/pay/:orderId` → system creates a transaction and payment record → calls Paystack initialization → returns payment authorization URL.
- **Applies to**: Customers with pending orders.

### 10. Paystack Webhook Handling
- **What it does**: Listens for payment events from Paystack and updates order/payment status.
- **How it works**: Webhook endpoint receives `charge.success`, `transfer.success`, `transfer.failed` events. Verifies signature → processes the event → updates transaction and order status accordingly.
- **Applies to**: System automatically on payment events.

### 11. Vendor Bank Account Management
- **What it does**: Allows vendors to add bank accounts for receiving payouts.
- **How it works**: Vendor submits bank account number and bank code → system resolves account name via Paystack → creates bank account record → generates Paystack transfer recipient.
- **Applies to**: Authenticated vendors.

### 12. Vendor Payout Approval
- **What it does**: Allows admins to approve payouts to vendors after successful order completion.
- **How it works**: Admin calls `/pay-vendors/:paymentId` → system initiates transfer to vendor's bank account via Paystack.
- **Applies to**: Admin users.

### 13. User Profile Management
- **What it does**: Allows users to view and update their profile information.
- **How it works**: Profile data includes age, location, country, and profile picture. Stored separately from user credentials.
- **Applies to**: All authenticated users.

### 14. Transaction History
- **What it does**: Provides users with a record of their payment transactions.
- **How it works**: Transactions are created for each payment attempt. Users can query their transaction history.
- **Applies to**: All authenticated users.

## API Overview

### Authentication Endpoints (`/api`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Create new user account | No |
| POST | `/verify-email` | Verify email with OTP code | No |
| POST | `/resend` | Resend verification OTP | No |
| POST | `/login` | Authenticate and get token | No |
| PATCH | `/onboard` | Set user role (Vendor/Customer) | Yes |
| POST | `/password-change` | Request password reset | No |
| POST | `/password-confirm` | Confirm password reset | No |

### User Profile Endpoints (`/api`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/profile` | Get current user profile | Yes |
| PATCH | `/profile` | Update profile details | Yes |
| GET | `/profile/:id` | Get public profile by ID | Yes |

### Catalog Endpoints (`/api`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/products` | Create a new product | Yes (Vendor) |
| GET | `/products` | List products with filters | No |
| GET | `/products/:id` | Get product details | Yes |
| PATCH | `/products/:id` | Update product | Yes (Owner) |
| DELETE | `/products/:id` | Delete product | Yes (Owner) |
| POST | `/carts-add` | Add item to cart | Yes |
| DELETE | `/carts-remove` | Remove item from cart | Yes |
| GET | `/cart` | List cart items | Yes |
| POST | `/category` | Create category | No |
| GET | `/category` | List categories | No |
| POST | `/check-out` | Create order from cart | Yes (Customer) |
| GET | `/orders` | List user orders | Yes |
| GET | `/orders/:orderId` | Get order details | Yes |
| PATCH | `/orders/:orderId/cancel` | Cancel pending order | Yes |

### Payment Endpoints (`/api`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/add-bank` | Add vendor bank account | Yes (Vendor) |
| POST | `/pay/:orderId` | Initiate payment | Yes |
| POST | `/paystack/webhook` | Handle Paystack events | No |
| POST | `/pay-vendors/:paymentId` | Approve vendor payout | Yes (Admin) |
| GET | `/transactions` | List user transactions | Yes |

## Authentication & Security

### Token-Based Authentication
- Users authenticate via `/login` and receive a JWT access token.
- Tokens expire after 30 minutes.
- Protected routes require the `Authorization: Bearer <token>` header.

### Role-Based Access Control (RBAC)
- **Vendors**: Can create products, manage their own products, add bank accounts.
- **Customers**: Can browse products, manage cart, place orders, view transactions.
- **Admins**: Can approve vendor payouts.
- Middleware `isVendor`, `isCustomer`, `isAdmin` enforce role checks.

### Ownership Verification
- The `IsOwner` middleware ensures users can only modify resources they own (products, carts, orders).
- Prevents unauthorized modifications to other users' data.

### Password Security
- Passwords are hashed using bcrypt with 10 salt rounds before storage.
- OTP codes are also hashed for storage security.

### Idempotency
- The `idempotencyMiddleware` ensures payment requests can be safely retried.
- Clients pass an `X-Idempotency-Key` header; if omitted, the server generates one.
- Prevents duplicate charges from retried requests.

### Webhook Signature Verification
- Paystack webhooks include a signature header verified using HMAC-SHA512.
- Prevents fake webhook events from manipulating order status.

### Request Validation
- All incoming requests are validated against AJV JSON schemas.
- Invalid requests return detailed validation error messages.

## Payment Flow

### 1. Customer Initiates Payment
- Customer calls `POST /api/pay/:orderId` with their order ID.
- System validates the order belongs to the user and is in PENDING status.
- Creates a transaction record with a unique reference key.
- Creates a payment record linked to the order.
- Calls Paystack's initialization API with the amount and customer email.
- Returns a Paystack authorization URL to the client.

### 2. Customer Completes Payment
- Customer is redirected to the Paystack hosted page.
- Enters card details and completes authentication.
- Paystack processes the charge and redirects back to the merchant site.

### 3. Webhook Processing
- Paystack sends a webhook to `/api/paystack/webhook` on payment success.
- System verifies the webhook signature to prevent spoofing.
- Finds the transaction by reference key.
- Updates transaction status to COMPLETED.
- Updates payment status to COMPLETED.
- Updates order status to COMPLETED.
- Logs the webhook event for audit trail.

### 4. Vendor Payout (Admin Approval)
- After order completion, admin can approve payout to the vendor.
- Admin calls `POST /api/pay-vendors/:paymentId`.
- System retrieves the vendor's bank account and transfer recipient code.
- Initiates a Paystack transfer to the vendor's bank account.
- Paystack sends a webhook on transfer success/failure.
- System updates the payment record based on transfer status.

### Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Duplicate payment request | Idempotency key checked; duplicate returns existing transaction |
| Payment webhook duplicate | Webhook events logged; duplicates are detected and ignored |
| Insufficient stock | Cart addition validates available stock before saving |
| Invalid category | Product creation validates categoryId exists |
| Order not found | Returns 404 with appropriate error message |
| Payment failure | Webhook handler processes failed status and updates records |
| Transfer failure | Transfer failed webhook updates payment status |

## Database Design

### Users Table
| Field | Type | Constraints |
|-------|------|-------------|
| userId | UUID | Primary Key, Unique |
| email | STRING | Unique, Not Null |
| username | STRING | Optional |
| firstName | STRING | Optional |
| lastName | STRING | Optional |
| phone | CHAR | Not Null |
| password | CHAR | Not Null (hashed) |
| role | STRING | Default NULL (VENDOR/CUSTOMER) |
| isActive | BOOLEAN | Default false |
| isVerified | BOOLEAN | Default false |

### Profiles Table
| Field | Type | Constraints |
|-------|------|-------------|
| profileId | UUID | Primary Key, Unique |
| ownerId | UUID | Unique (FK to Users) |
| age | STRING | Optional |
| location | STRING | Optional |
| country | STRING | Optional |
| profilePicture | STRING | Optional |

### Category Table
| Field | Type | Constraints |
|-------|------|-------------|
| categoryId | UUID | Primary Key, Unique |
| name | STRING | Not Null |

### Products Table
| Field | Type | Constraints |
|-------|------|-------------|
| productId | UUID | Primary Key, Unique |
| name | CHAR | Not Null |
| shortDescription | STRING | Optional |
| categoryId | UUID | Not Null (FK to Category) |
| ownerId | UUID | Not Null (FK to Users) |
| price | DECIMAL | Not Null |
| availableStock | INTEGER | Default 0 |
| image | ARRAY(STRING) | Default [] |
| isAvailable | BOOLEAN | Default true |

### Carts Table
| Field | Type | Constraints |
|-------|------|-------------|
| cartId | UUID | Primary Key, Unique |
| ownerId | UUID | Not Null (FK to Users) |

### CartItems Table
| Field | Type | Constraints |
|-------|------|-------------|
| cartItemsId | UUID | Primary Key, Unique |
| cartId | UUID | Not Null (FK to Carts) |
| productId | UUID | Not Null (FK to Products) |
| quantity | INTEGER | Default 0 |

### Orders Table
| Field | Type | Constraints |
|-------|------|-------------|
| orderId | UUID | Primary Key, Unique |
| ownerId | UUID | Not Null (FK to Users) |
| status | STRING | Default PENDING (PENDING/CANCELLED/COMPLETED) |

### OrderItems Table
| Field | Type | Constraints |
|-------|------|-------------|
| orderItemsId | UUID | Primary Key, Unique |
| orderId | UUID | Not Null (FK to Orders) |
| productId | UUID | Not Null (FK to Products) |
| quantity | INTEGER | Not Null, Default 0 |

### Payments Table
| Field | Type | Constraints |
|-------|------|-------------|
| paymentId | UUID | Primary Key, Unique |
| orderId | UUID | Not Null (FK to Orders) |
| ownerId | UUID | Not Null (FK to Users) |
| totalAmount | INTEGER | Default 0 |
| status | STRING | Default PENDING |
| completedAt | DATE | Default NULL |
| failedAt | DATE | Default NULL |
| referenceKey | STRING | Unique, Not Null |

### Transactions Table
| Field | Type | Constraints |
|-------|------|-------------|
| transactionId | UUID | Primary Key, Unique |
| transactionType | STRING | DEPOSIT/TRANSFER |
| idempotencyKey | UUID | Unique |
| referenceKey | STRING | Unique |
| ownerId | UUID | Not Null (FK to Users) |
| amount | INTEGER | Not Null |
| status | STRING | Default PENDING |
| metaData | JSON | Default {} |
| completedAt | DATE | Default NULL |
| failedAt | DATE | Default NULL |

### BankAccount Table
| Field | Type | Constraints |
|-------|------|-------------|
| accountId | UUID | Primary Key, Unique |
| ownerId | UUID | Unique (FK to Users) |
| accountName | STRING | Optional |
| accountNumber | STRING | Not Null |
| bankCode | STRING | Optional |
| bankName | STRING | Optional |
| bankId | STRING | Optional |
| receipientCode | STRING | Optional |
| isVerified | STRING | Default false |

### WebhookEvent Table
| Field | Type | Constraints |
|-------|------|-------------|
| webhookId | UUID | Primary Key, Unique |
| referenceKey | CHAR | Not Null |
| event | STRING | Not Null |
| status | STRING | Default RECEIVED |

### OneTimePassword Table
| Field | Type | Constraints |
|-------|------|-------------|
| otpId | UUID | Primary Key, Unique |
| ownerId | UUID | Not Null (FK to Users) |
| rawCode | STRING | Not Null |
| hashCode | STRING | Not Null |
| isUsed | BOOLEAN | Default false |

### Key Relationships
- One User → One Profile
- One User → One Cart
- One User → Many Products
- One User → Many Orders
- One User → Many BankAccounts
- One Category → Many Products
- One Cart → Many CartItems
- One Order → Many OrderItems
- One Product → Many CartItems
- One Product → Many OrderItems

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher) OR **SQLite** (for development)
- **npm** or **yarn**

### Installation Steps

1. **Clone the repository**
   ```bash
   cd Market-API/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` and fill in the required values:

   ```env
   # JWT Configuration
   JWT_SECRET=your-secret-key-here

   # Email (Brevo)
   BREVO_API_KEY=your-brevo-api-key
   FROMEMAIL=your-sender-email
   FROMNAME=Your App Name
   APPNAME=Market-API
   EXPIRY_TIME=10

   # Paystack
   PAYSTACK_BASE_URL=https://api.paystack.co
   PAYSTACK_SECRE_KEY=your-paystack-secret-key

   # Database
   POSTGRES_DATABASE=market-api
   POSTGRES_USERNAME=postgres
   POSTGRES_PASSWORD=your-db-password

   # Optional
   OTPLength=6
   PLATFORM_PERCENT=0
   ```

4. **Create the database**
   ```bash
   # For PostgreSQL
   createdb market-api

   # Or use SQLite (no setup needed)
   ```

5. **Start the server**
   ```bash
   # Development with auto-restart
   npm run dev

   # Production
   npm start
   ```

6. **Access the API**
   - Server: `http://127.0.0.1:3000`
   - Swagger Docs: `http://127.0.0.1:3000/api-docs`

### Quick Test Flow

1. **Register a user**: `POST /api/register`
2. **Verify email**: `POST /api/verify-email` with OTP code
3. **Login**: `POST /api/login` → get JWT token
4. **Onboard**: `PATCH /api/onboard` with role (VENDOR or CUSTOMER)
5. **If Vendor**: Add bank account → create products
6. **If Customer**: Browse products → add to cart → checkout → pay