# Housevote App Implementation Plan

This document outlines the implementation plan for the `housevote` application within the TurboDima monorepo, leveraging the framework's best practices.

**Assumptions:**

* The `housevote` app directory (`apps/housevote`) exists.
* Basic Next.js setup within `apps/housevote` is complete.
* `yo` and `generator-turbodima` are installed and linked globally.
* Testing generation is skipped (`--generateTests=false`).

**Reference Documentation Files:**

* `01-core-concepts.md`: Architecture, Principles, Admin Structure.
* `02-ui-components.md`: Component patterns, available components.
* `03-forms-and-actions.md`: Form system, Server Action patterns, Error Handling.
* `04-routing-and-state.md`: App Router usage, State Management.
* `05-implementation-patterns.md`: Feature organization, Prisma/Zod usage, Component/Action/Page patterns.
* `06-code-generation.md`: Generator usage details.
* `07-schema-best-practices.md`: Detailed Prisma/Zod schema guidance.
* `08-ai-agent-generator-guide.md`: Specific instructions for using generators non-interactively.
* `component-organization.md`: Detailed UI component structure (if applicable).
* `dima-design.md`: High-level workflow phases.

---

## Phase 1: Project Setup & Core Models [COMPLETED]

Establish the foundation: app initialization, authentication, database connection, and core data models.

* **Step 1.1: Initialize `housevote` App Configuration** [COMPLETED]
  * * [x] Ensure `apps/housevote/package.json` includes necessary dependencies (`@turbodima/ui`, `@turbodima/core`, `next`, `react`, `tailwindcss`, `prisma`, `@prisma/client`, `@clerk/nextjs`, `zod`, etc.).
  * * [x] Set up `apps/housevote/tailwind.config.js` to extend the base Tailwind config and include `shadcn/ui` presets.
  * * [x] Configure `apps/housevote/tsconfig.json` to extend the base TypeScript config (`@turbodima/configs/tsconfig/nextjs.json`).
  * * [x] Set up basic Next.js App Router structure (`app/layout.tsx`, `app/page.tsx`). Reference `04-routing-and-state.md`.

* **Step 1.2: Configure Authentication (Clerk)** [COMPLETED]
  * * [x] Add Clerk environment variables (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) to `.env` (and `.env.example`) in the monorepo root, potentially namespaced for this app if needed.
  * * [x] Wrap the root layout (`apps/housevote/app/layout.tsx`) with `<ClerkProvider>`.
  * * [x] Create standard Clerk authentication pages (`sign-in/[[...sign-in]]/page.tsx`, `sign-up/[[...sign-up]]/page.tsx`) within `apps/housevote/app/`.
  * * [x] Implement middleware (`apps/housevote/middleware.ts`) to protect routes, potentially redirecting unauthenticated users trying to access owner-specific features. Reference `03-forms-and-actions.md` / Clerk docs.

* **Step 1.3: Setup Prisma** [COMPLETED]
  * * [x] Add Prisma Client (`@prisma/client`) and Prisma CLI (`prisma`) as dev dependencies in `apps/housevote/package.json`.
  * * [x] Initialize Prisma within the app: `cd apps/housevote && npx prisma init --datasource-provider postgresql` (adjust provider if needed).
  * * [x] Configure `apps/housevote/prisma/schema.prisma` with the database connection URL (using `env("DATABASE_URL")`).
  * * [x] Add the `zod-prisma` generator to `schema.prisma`. Reference `07-schema-best-practices.md`.

        ```prisma
        generator client {
          provider = "prisma-client-js"
          output   = "../../../node_modules/.prisma/client" // Adjust path based on monorepo structure if needed
        }

        generator zod {
          provider                 = "zod-prisma"
          output                   = "./zod" // Output within prisma directory
          relationModel            = true
          modelCase                = "PascalCase"
          modelSuffix              = "Schema"
          useDecimalJs             = true
          prismaJsonNullability    = true
        }
        ```

  * * [x] Create a Prisma client instance utility (e.g., `apps/housevote/src/db.ts` or reuse from `@turbodima/core` if applicable).

* **Step 1.4: Define Core Prisma Models** [COMPLETED]
  * * [x] Define `Trip`, `Listing`, and `Like` models in `apps/housevote/prisma/schema.prisma`.
  * * [x] Include all necessary fields identified in the blueprint (name, dates, counts, URLs, status, geo, etc.).
  * * [x] Establish relationships (Trip -> Owner (User ID from Clerk), Trip -> Listings, Listing -> Likes).
  * * [x] **Crucially:** Add `@zod.` directives for basic validation (min length, types, required fields) directly in the schema comments. Reference `07-schema-best-practices.md`.
    * Example: `/// @zod.min(3, { message: "Trip name must be at least 3 characters" })`
  * * [x] Run `cd apps/housevote && npx prisma db push` (or `migrate dev`) to sync the schema with the database.
  * * [x] Run `cd apps/housevote && npx prisma generate` to create Prisma Client types and generate Zod schemas into `prisma/zod/`.

---

## Phase 2: Feature Generation & Implementation - Trips [IN PROGRESS]

Generate and refine the core CRUD functionality for Trips, focusing on the Trip Owner's perspective.

* **Step 2.1: Database Connection Utility** [COMPLETED]
  * * [x] Create the database connection utility (`src/db.ts`).
  * * [x] Implement Prisma client singleton pattern to prevent connection exhaustion.

* **Step 2.2: Implement Trip Feature Files** [COMPLETED]
  * * [x] **Types & Schemas:** Create trip-related types and schemas.
    * Created `trips/schemas.ts` with proper Zod schema derived from Prisma.
  * * [x] **Database Operations Layer:** Implement database operations following the two-layer pattern.
    * Created `trips/db.ts` with core database operations for all CRUD operations.
    * Implemented proper error handling with the `handleDbOperation` utility.
  * * [x] **Server Actions:** Implement server actions for trip operations.
    * Created `trips/actions/createTrip.ts` with validation, auth checks, and error handling.
    * Created `trips/actions/getTrips.ts` with caching via React's `cache` function.
  * * [x] **Forms:** Create form components for trip operations.
    * Implemented `trips/forms/TripForm.tsx` with date pickers and validation.
  * * [x] **Tables:** Implement table components for displaying trips.
    * Created `trips/tables/TripsTable.tsx` with proper column definitions and actions.

* **Step 2.3: Implement Trip List Page** [COMPLETED]
  * * [x] Create main trips list page (`app/trips/page.tsx`).
  * * [x] Implement as a Server Component with proper data fetching.
  * * [x] Integrate `TripsTable` component for displaying fetched trips.
  * * [x] Add page header with title and create trip button.
  * * [x] Create trip form page (`app/trips/create/page.tsx`) with the `TripForm` component.
  * * [x] Ensure authentication protection for all trip-related routes.

---

## Phase 3: Feature Generation & Implementation - Listings [IN PROGRESS]

Generate and adapt CRUD for Listings, handling the relationship to Trips and the unique aspects of adding listings (URL parsing, manual entry).

* **Step 3.1: Generate Listing Feature**
  * * [ ] Navigate to `cd apps/housevote/src/features`.
  * * [ ] Run the feature script generator.

* **Step 3.2: Refine Generated Listing Files** [COMPLETED]
  * * [x] **Types (`listings/types.ts`):** Reviewed generated types. Added `ListingStatus`, `ListingGetOptions`, `ListingCreateInputData`.
  * * [x] **Schemas (`listings/schemas.ts`):** Implemented `ListingFormDataSchema`.
  * * [x] **Database Ops (`listings/db.ts`):** Implemented database operations. Refined types and fixed transaction client issues. Added `select` support to `get`.
  * * [x] **Server Actions (`listings/actions/`):** Refined `create`, `get`, `getMany`, `update`, `delete` actions with standard pattern, auth checks, and correct revalidation.
  * * [x] **Forms (`listings/forms/ListingForm.tsx`):** Created form component with correct fields and actions.
  * * [x] **Tables (`listings/tables/ListingsTable.tsx`):** Refined table, added Status/Likes columns, implemented Delete action.

---

## Phase 4: Trip Dashboard & Collaboration Features [IN PROGRESS]

Build the main collaborative interface where users view, add, and vote on listings.

* **Step 4.1: Create Trip Dashboard Page** [COMPLETED]
  * * [x] Create the dynamic route page: `apps/housevote/app/trips/[tripId]/page.tsx`.
  * * [x] Fetch trip details (`getTrip`) and listings (`getListingsByTrip`).
  * * [x] Display `TripHeader` component.
  * * [x] Implement the "Add Listing" flow.
  * * [x] Display the `ListingsTable`, passing the fetched listings.

* **Step 4.2: Implement Listing Map View** [COMPLETED]
  * * [x] Integrate a map library (React Leaflet).
  * * [x] Create the map-related components (`ListingsMap`).
  * * [x] Add logic to toggle between table and map views.
  * * [x] Pass listing data to the map view.

* **Step 4.3: Implement Invitation Flow** [COMPLETED]
  * * [x] Create server action for generating invite links (`createInvitation`).
  * * [x] Implement dialog form for sending invitations.
  * * [x] Create invitation model and database schema.
  * * [x] Implement invitation acceptance/decline page and logic.
  * * [x] Add collaborator relationship support.

* **Step 4.4: Implement Collaborator Join & View** [COMPLETED]
  * * [x] Create the join page.
  * * [x] Implement actions for handling invites.
  * * [x] Create the page logic for collaborator joining.
  * * [x] Modify the Trip Dashboard authorization logic.

* **Step 4.5: Implement Liking Feature** [COMPLETED]
  * * [x] Implement database operations for likes.
  * * [x] Create server action for toggling likes.
  * * [x] Implement UI for like toggling.

* **Step 4.6: Implement Reject/Un-reject Actions** [COMPLETED]
  * * [x] Implement database operations for updating listing status.
  * * [x] Create server action for rejecting/un-rejecting.
  * * [x] Implement UI for rejection controls.

---

## Phase 5: Polish & Refinements (Optional V1+) [NOT STARTED]

* * [ ] **Real-time Updates:** Explore solutions for real-time updates.
* * [ ] **UI Styling:** Refine styling and visual appeal.
* * [ ] **Error Handling:** Enhance user feedback for errors.
* * [ ] **Loading States:** Implement comprehensive loading states.

---

## Current Progress Summary

**Completed:**

* Phase 1: Project Setup & Core Models fully implemented
* Phase 2: Trip feature fully implemented
* Phase 3: Listing feature implementation
* Phase 4: Trip Dashboard & Collaboration
  * Created Trip Dashboard page with data fetching
  * Implemented map view using React Leaflet
  * Added view toggle functionality
  * Implemented invitation flow with collaborator support
  * Implemented collaborator view and access control functionality

**In Progress:**

* Phase 4: Trip Dashboard & Collaboration Features
  * Implement Add Listing flow on dashboard
  * ~~Implement Collaborator Join & View enhancements (authorization)~~
  * Implement Liking Feature

**Known Issues:**

* ESLint configuration errors persist
* Environment variables need to be set up
* Potential stale type errors for `Listing` model in `ListingsMap.tsx`
