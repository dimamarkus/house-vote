# Development Log

## 2026-04-02

**Planned Tasks:**

* Start extracting `housevote` from the `turbodima` monorepo into a standalone app-owned repo.
* Replace shared repo-level config with local config.
* Decide package naming, auth, database, generated-code, and CI/deploy direction.
* Begin removing monorepo core-package dependency safely.

**Session Goals:** Establish standalone repo ownership for config and docs, then replace the shared `@turbodima/core` dependency with local app-owned equivalents.

**Decisions:**

* Renamed the standalone package to `house-vote`.
* Clerk stays.
* Prisma + Postgres stay.
* Prisma-generated client and Zod outputs should be generated locally and ignored in git.
* CI/deploy is deferred until after the standalone app is locally healthy.
* Used a local compatibility layer for the shared core package first to reduce churn while extracting.

**Progress:**

* ✅ Added standalone extraction roadmap in `docs/260402HOUSEVOTE__STANDALONE_EXTRACTION_PLAN.md`.
* ✅ Replaced monorepo-owned repo config with local ownership:
  * Updated `package.json` package name, scripts, package manager, and Node engine.
  * Replaced shared `tsconfig` inheritance with a local standalone `tsconfig.json`.
  * Replaced shared ESLint config with local `eslint.config.mjs`.
  * Reduced `next.config.ts` coupling by removing `@turbodima/core` from `transpilePackages`.
  * Updated `.gitignore` to ignore generated Prisma outputs.
* ✅ Added standalone setup docs:
  * Created `README.md`.
  * Created `env.example`.
* ✅ Removed dependency on `@turbodima/configs` and `@turbodima/core` from `package.json`.
* ✅ Added local compatibility replacements for the currently used `@turbodima/core` modules:
  * errors
  * responses
  * form-data validation
  * Prisma bootstrap
  * constants
  * auth hook
  * search-param processing
  * server-action helpers
  * shared core types and schemas
* ✅ Localized the `@turbodima/ui` dependency into an app-owned compatibility layer:
  * Added local replacements for the currently used UI primitives, form helpers, tables, theme helpers, and utility functions.
  * Removed the final `@turbodima/ui` `workspace:*` dependency from `package.json`.
  * Replaced shared CSS token dependency in `globals.css` with app-owned theme variables.
  * Simplified a few components during extraction where that reduced dependency surface safely (for example, the date picker now uses a native date input).
* ✅ Verified the standalone repo locally:
  * `pnpm install`
  * `pnpm db:generate`
  * `pnpm check-types`
  * `pnpm lint`
  * `pnpm build` with dummy Clerk env vars for build-time validation

**Challenges:**

* The clone did not have a local `README.md` or env example, so the developer setup surface had to be created from scratch.
* The extraction needed a larger UI localization pass than `toliks-poems` because the app depended on shared forms, tables, and theming helpers in addition to basic primitives.
* Verification exposed a lot of pre-existing lint debt inside the cloned app. That had to be cleaned up before the standalone build could pass end-to-end.
* Next 15's ESLint config shape differed from the newer setup pattern used elsewhere, so the local `eslint.config.mjs` had to be adapted with `FlatCompat`.

**Blockers:**

* No extraction blockers remain for local development.
* Real runtime validation still depends on providing actual Clerk and database env vars.

## 2024-07-28

**Planned Tasks:**

* Initialize project tracking files.
* Begin Phase 1 of `housevote` app implementation:
  * Step 1.1: Initialize app configuration (`package.json`, `tailwind.config.js`, `tsconfig.json`, basic Next.js structure).
  * Step 1.2: Configure Clerk authentication.
  * Step 1.3: Setup Prisma.
  * Step 1.4: Define core Prisma models (`Trip`, `Listing`, `Like`) with Zod directives.

**Session Goals:** Complete initial setup steps for the `housevote` application as outlined in Phase 1 of the development plan.

**Decisions:**

* Following `apps/housevote/development-plan.md`.
* Skipping test generation (`--generateTests=false`) for initial feature scaffolding as per the plan.
* Using src/app directory structure for Next.js app.

**Progress:**

* ✅ Step 1.1: Completed app configuration
  * Added all necessary dependencies to package.json
  * Set up Next.js app router structure with src/app directory
  * Created basic layout and homepage
  * Configured PostCSS for Tailwind CSS
  * Successfully built the application
* ✅ Step 1.2: Configured Clerk Authentication
  * Wrapped layout in `ClerkProvider`.
  * Added sign-in and sign-up pages.
  * Implemented middleware for route protection.
  * Added basic `Header` component with `UserButton`.
* ✅ Step 1.3: Setup Prisma
  * Ran `prisma init`.
  * Created `prisma/schema.prisma`.
* ✅ Step 1.4: Defined Core Prisma Models
  * Added `User` (stub), `Trip`, `Listing`, `Like` models.
  * Included relations and Zod directives.
  * Generated Prisma client and Zod schemas.
  * Added `zod-prisma` dev dependency.
  * Fixed Zod schema generation errors related to directives.

**Challenges:**

* Clerk `middleware.ts` required adjustment due to API changes (`auth.protect()` vs `auth().protect()`).
* Unable to create `.env.example` due to ignore rules (User needs to set env vars manually).
* Persistent ESLint build error (`The requested module './base.js' does not provide an export named 'config'`) despite attempted fixes in shared config. Needs manual investigation.
* Initial Zod directives for `Int` and `DateTime` fields caused build errors in generated schemas; directives were adjusted/removed.

**Blockers:**

* None.

## 2024-07-29

**Planned Tasks:**

* Phase 2: Implement Core Features
  * Step 2.1: Create Database Connection Utility
  * Step 2.2: Implement `/trips` page (List View)

**Session Goals:** Start implementing Phase 2 features, beginning with the DB utility and the trips list page.

**Decisions:**

* Placed DB utility in `src/db.ts`.

**Progress:**

* ✅ Step 2.1: Created Database Connection Utility
  * Created `src/db.ts` with standard Prisma client setup.
  * Corrected client import path.

**Challenges:**

* Persistent ESLint build error remains.

**Blockers:**

* ESLint configuration error (see previous entry).

## 2024-07-30

**Planned Tasks:**

* Continue Phase 2: Implement Core Features
  * Step 2.2: Complete `/trips` page (List View)
  * Step 2.3: Implement database operations layer pattern

**Session Goals:** Complete the trip list view, implement the proper TripsTable component, and refine the database operations following the two-layer pattern outlined in the documentation.

**Decisions:**

* Followed two-layer pattern for database operations as outlined in the documentation.
* Implemented server-side rendered trips list with TripsTable component.

**Progress:**

* ✅ Step 2.2: Implemented `/trips` page (List View)
  * Created `TripsTable` component for displaying trips.
  * Updated the existing `/trips` page to use the new table component.
  * Implemented proper type checking throughout.
* ✅ Step 2.3: Implemented database operations layer
  * Created `db.ts` with core database operations for trips.
  * Implemented proper error handling with `handleDbOperation` utility.
  * Updated server actions to use the database operations layer.
  * Implemented `getTrips` action with caching via React's `cache` function.

**Challenges:**

* Fixed linter errors related to Prisma's include types.
* Fixed issues with complex type handling in error responses.
* Made sure to follow proper type safety patterns for all components.

**Blockers:**

* ESLint configuration error still persists.

## 2024-07-31

**Planned Tasks:**

* Continue Phase 3: Implement Listing Feature
  * Refine generated/manual Listing feature files.

**Session Goals:** Address type errors in the Listing database operations and continue implementing the Listing feature.

**Decisions:**

* Manually refining Listing feature components due to generator issues.
* Applied type assertion fix for Prisma `TransactionClient` ambiguity.

**Progress:**

* ✅ Refined `listings/db.ts`:
  * Fixed TypeScript error related to `TransactionClient` not recognizing Prisma models by using type assertion (`dbClient as DbClientWithModels`).
  * Corrected the type for the `sortBy` parameter in the `getMany` function.
  * Added `ListingStatus` enum and `status` field to Prisma schema.
  * Added `select` support to `listings.get` and refined option types.
  * Fixed `db.ts` import path issues after recreating the file.
* ✅ Implemented `listings/types.ts`:
  * Added `ListingStatus`, `ListingGetOptions`, `ListingCreateInputData`.
* ✅ Implemented `listings/schemas.ts`:
  * Defined `ListingFormDataSchema`.
* ✅ Refined `listings/actions/`:
  * Updated `createListing`, `getListing`, `getListings`, `updateListing`, `deleteListing` to use standard patterns (auth, validation, error handling, revalidation).
  * Added authorization checks to `updateListing` and `deleteListing`.

**Challenges:**

* Troubleshooting persistent linter errors related to type conflicts and incorrect import paths for `db.ts`, eventually discovering the file was missing and recreating it.

**Blockers:**

* ESLint configuration error still persists.

## 2024-08-01

**Planned Tasks:**

* Phase 4: Implement Trip Dashboard & Map View
  * Step 4.1: Create Trip Dashboard Page (`/trips/[tripId]`)
  * Step 4.2: Implement Listing Map View

**Session Goals:** Implement the core Trip Dashboard page, including fetching trips/listing data and integrating a map view for listings.

**Decisions:**

* Used React Leaflet for the map implementation.
* Made the Trip Dashboard page a Client Component to handle view mode state and dynamic map loading.
* Added `latitude` and `longitude` to `Listing` model.
* Reset database using `prisma migrate reset` due to migration drift.

**Progress:**

* ✅ Step 4.1: Created Trip Dashboard Page
  * Added `getTrip` action and corresponding `trips.get` DB operation.
  * Added `getListingsByTrip` action and `listings.getManyByTripId` DB operation.
  * Created `TripHeader` component.
  * Implemented `/trips/[tripId]/page.tsx` to fetch data and display header/table.
* ✅ Step 4.2: Implemented Listing Map View
  * Added `latitude` and `longitude` to `Listing` model and migrated DB.
  * Installed `react-leaflet` and `leaflet`.
  * Created `ListingsMap` component using react-leaflet.
  * Modified Trip Dashboard page to be a client component with view mode toggle (Table/Map) and dynamic map loading.

**Challenges:**

* Encountered Prisma migration drift, resolved by resetting the database.
* Resolved multiple TypeScript errors related to action/response types, component props, and client-side data fetching patterns.
* Encountered potential stale type errors for updated Prisma model in `ListingsMap.tsx` (requires editor/TS server restart).
* Corrected Clerk `auth()` usage in server action.
* Fixed import paths for `db` utility.

**Blockers:**

* ESLint configuration error still persists.

## 2024-08-02

**Planned Tasks:**

* Phase 4: Trip Dashboard & Collaboration Features
  * Step 4.3: Implement Invitation Flow

**Session Goals:** Implement the full invitation flow, allowing trip owners to invite collaborators and providing a way for invitees to join trips.

**Decisions:**

* Added TripInvitation model with M:M relationship between User and Trip models
* Used crypto.randomUUID() for secure invitation token generation
* Set 24-hour expiration for invitations
* Created a dedicated invitation page for accepting/declining invitations

**Progress:**

* ✅ Step 4.3: Implemented Invitation Flow
  * Updated Prisma schema with Trip-User many-to-many relationship for collaborators
  * Added TripInvitation model with token and status tracking
  * Created migration for the schema changes
  * Implemented server actions for creating and handling invitations
  * Built InviteCollaboratorForm component for sending invitations
  * Integrated invitation form into TripHeader
  * Created invitation acceptance page at `/invite/[token]`
  * Added status handling for accepted/declined/expired invitations
  * Modified Trip Dashboard to support collaborators

**Challenges:**

* Resolved issues with db.ts imports and validation utility
* Fixed type errors in server actions
* Fixed form element validation
* Managed proper redirection after invitation acceptance/decline

**Blockers:**

* ESLint configuration error still persists

## 2024-08-03

**Planned Tasks:**

* Phase 4: Trip Dashboard & Collaboration Features
  * Complete Step 4.1: Implement the "Add Listing" flow

**Session Goals:** Complete the listing creation functionality from the Trip Dashboard.

**Decisions:**

* Integrated Add Listing button and form into the Trip Dashboard
* Modified ListingForm to support direct tripId addition
* Used dialog pattern for better UX when adding listings

**Progress:**

* ✅ Step 4.1: Implemented "Add Listing" flow
  * Created AddListingButton component
  * Modified ListingFormDialog to handle tripId parameter
  * Updated TripHeader to include AddListingButton
  * Fixed type issues with ListingForm props
  * Ensured form validation and error handling worked properly

**Challenges:**

* Resolved issues with form state management
* Fixed type errors in component props
* Ensured proper validation and error handling

**Blockers:**

* ESLint configuration error still persists

## 2024-08-04

**Planned Tasks:**

* Phase 4: Trip Dashboard & Collaboration Features
  * Step 4.4: Implement Collaborator Join & View functionality

**Session Goals:** Complete the collaborator view functionality, allowing collaborators to view trips they've been invited to and see who else has access to the trip.

**Decisions:**

* Updated trips db functions to always include collaborators for access checks
* Created a dedicated CollaboratorsList component
* Modified TripsTable to display owner/collaborator status
* Updated the trip dashboard page to show collaborators

**Progress:**

* ✅ Step 4.4: Implemented Collaborator View functionality
  * Fixed type issues in the trips.get and getTrip database functions to properly handle collaborators
  * Updated the TripsTable component to show when a user is a collaborator rather than owner
  * Created CollaboratorsList component to display trip members
  * Modified trip dashboard page to show collaborators panel
  * Updated trips page to display both owned and shared trips
  * Ensured proper access controls for trip viewing and editing

**Challenges:**

* Resolved complex type issues with Prisma include statements
* Fixed errors with nullable vs undefined field types in the ListingsMap component
* Managed proper typing for collaborator list components
* Ensured proper access control checks in database functions

**Blockers:**

* ESLint configuration error still persists

## 2024-08-05

**Planned Tasks:**

* Phase 4: Implement Guest Collaborator Functionality
  * Modify Prisma Schema for Guest Support

**Session Goals:** Adapt the database schema to allow for guest users who join via shareable links without authentication.

**Decisions:**

* Modified `Like` and `Listing` models to make user relations optional (`userId`, `addedById`) and added fields for guest display names (`guestDisplayName`, `addedByGuestName`).
* Removed database-level unique constraint on `Like` model (`@@unique([userId, listingId])`); uniqueness will be handled in the server action logic to accommodate both user IDs and guest names.

**Progress:**

* ✅ Modified `prisma/schema.prisma` with nullable user relations and guest name fields for `Like` and `Listing`.
* ✅ Created and applied database migration `20250503061905_add_guest_support`.
* ✅ Regenerated Prisma Client and Zod schemas.

**Challenges:**

* Need to carefully update server actions and UI components to handle both authenticated users and guests correctly.
* Uniqueness logic for Likes needs careful implementation in the server action.

**Blockers:**

* ESLint configuration error still persists.
