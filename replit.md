# AJKMart Super App — Workspace

## Project Overview

**AJKMart** is a full-stack "Super App" combining Grocery Shopping (Mart), Food Delivery, and Taxi/Bike Booking with a unified digital wallet. Built for Azad Jammu & Kashmir (AJK), Pakistan.

### Artifacts
- **`artifacts/ajkmart`** — Expo React Native mobile app (web-compatible via Expo Go)
- **`artifacts/api-server`** — Express 5 REST API backend

### User Roles
- `customer` — shops, orders food, books rides
- `rider` — delivery/taxi driver (rider dashboard in profile)
- `vendor` — store owner (vendor dashboard in profile)

---

## Tech Stack

- **Monorepo**: pnpm workspaces (TypeScript composite projects)
- **Frontend**: Expo React Native + NativeWind, Blue/White theme
- **Backend**: Express 5 + PostgreSQL + Drizzle ORM
- **Auth**: Phone number + OTP (dev mode returns OTP in response)
- **API**: OpenAPI 3.1 → Orval codegen → React Query hooks + Zod schemas
- **State**: AuthContext + CartContext (AsyncStorage persistence)
- **Navigation**: expo-router file-based routing with native tabs

---

## Theme & Design

- Primary: `#1A56DB` (blue)
- Accent: `#F59E0B` (amber)
- Success: `#10B981` (green)
- Font: Inter (400, 500, 600, 700)

---

## Structure

```
artifacts/
├── ajkmart/             # Expo mobile app
│   ├── app/
│   │   ├── index.tsx           # Root redirect (auth or tabs)
│   │   ├── _layout.tsx         # Root stack layout + providers
│   │   ├── auth/index.tsx      # Phone + OTP auth screen
│   │   ├── mart/index.tsx      # Grocery shopping screen
│   │   ├── food/index.tsx      # Food delivery screen
│   │   ├── ride/index.tsx      # Bike/car booking screen
│   │   ├── cart/index.tsx      # Cart + checkout
│   │   └── (tabs)/
│   │       ├── _layout.tsx     # Tab navigation (Liquid Glass / Classic)
│   │       ├── index.tsx       # Home dashboard
│   │       ├── orders.tsx      # Order history
│   │       ├── wallet.tsx      # AJKMart Wallet
│   │       └── profile.tsx     # User profile (role-aware)
│   ├── context/
│   │   ├── AuthContext.tsx     # Auth state + OTP flow
│   │   └── CartContext.tsx     # Cart state + AsyncStorage
│   └── constants/colors.ts    # Blue/white theme tokens
│
└── api-server/          # Express REST API
    └── src/routes/
        ├── auth.ts         # POST /auth/send-otp, /auth/verify-otp
        ├── products.ts     # GET /products (filter by type/category/search)
        ├── orders.ts       # GET/POST /orders
        ├── wallet.ts       # GET /wallet/:userId, POST /wallet/topup
        ├── rides.ts        # POST /rides/estimate, POST /rides, GET /rides/:id
        ├── locations.ts    # Location tracking
        └── categories.ts  # GET /categories (mart/food)

lib/
├── db/src/schema/         # Drizzle schemas: users, products, orders,
│                          #   wallet_transactions, rides, live_locations
├── api-spec/openapi.yaml  # OpenAPI 3.1 spec for all endpoints
├── api-client-react/      # Generated React Query hooks + fetch client
└── api-zod/               # Generated Zod schemas

scripts/src/
└── seed.ts                # Seeds 20 demo products (12 mart + 8 food)
```

---

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/send-otp` | Send OTP (returns OTP in dev) |
| POST | `/api/auth/verify-otp` | Verify OTP, returns token + user |
| GET | `/api/products?type=mart&category=&search=` | List products |
| GET | `/api/categories?type=mart` | List categories |
| GET | `/api/orders?userId=` | User orders |
| POST | `/api/orders` | Place order |
| GET | `/api/wallet/:userId` | Wallet balance + transactions |
| POST | `/api/wallet/topup` | Add funds to wallet |
| POST | `/api/rides/estimate` | Fare estimate (distance/fare/duration) |
| POST | `/api/rides` | Book a ride |

---

## Ride Fare Formula
- **Bike**: Rs. 15 base + Rs. 8/km
- **Car**: Rs. 25 base + Rs. 12/km

---

## Running Locally

```bash
# API server (port from $PORT, default 8080)
pnpm --filter @workspace/api-server run dev

# Expo app (web preview via Expo)
pnpm --filter @workspace/ajkmart run dev

# Seed demo products
pnpm --filter @workspace/scripts run seed

# Push DB schema changes
pnpm --filter @workspace/db run push

# Regenerate API client (after changing openapi.yaml)
pnpm --filter @workspace/api-spec run codegen
```

---

## Root Scripts

- `pnpm run build` — typecheck then build all packages
- `pnpm run typecheck` — `tsc --build --emitDeclarationOnly`

---

## Packages

### `lib/db` (`@workspace/db`)
Drizzle ORM + PostgreSQL. Exports `db` client and schema tables. Schema includes: `usersTable`, `productsTable`, `ordersTable`, `walletTransactionsTable`, `ridesTable`, `liveLocationsTable`.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec (`openapi.yaml`) + Orval codegen config. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate client.

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks (e.g. `useGetProducts`, `useGetWallet`) and raw fetch functions (e.g. `estimateFare`, `bookRide`, `topUpWallet`). Also exports `setBaseUrl` for configuring the API base URL.

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from OpenAPI spec used in the API server for validation.

### `scripts` (`@workspace/scripts`)
Utility scripts. Run via `pnpm --filter @workspace/scripts run <script>`. Current scripts:
- `seed` — seeds demo products and food items
