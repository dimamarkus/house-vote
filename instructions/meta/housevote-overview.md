# App Blueprint: "HouseVote"

**1. Core Concept:** (Unchanged)
A collaborative web/mobile application designed to help groups of friends easily collect, compare, visualize, and vote on potential rental accommodations (like Airbnb, Vrbo) for a specific trip.

**2. User Roles:**

* **Trip Owner:** Creates the trip, manages trip settings, invites collaborators, can add/delete/reject listings, sets collaborator permissions (e.g., allowing them to add listings). Requires registration/login.
* **Collaborator:** Invited via a unique link. Can view trip details, view listings, potentially add listings (if enabled by Owner), and "like" multiple listings. Does *not* require registration. Their identity for voting/liking is tied to their browser session for that specific trip link via a self-entered name.

**3. Key User Flows (Updates Highlighted):**

* **Flow A: Creating a New Trip (Trip Owner)** (Largely unchanged)
  * ... (Steps 1-5 as before) ...
  * *New Step 6:* On the Trip Dashboard, the Owner sees an option to set Collaborator Permissions (e.g., a toggle for "Allow Collaborators to Add Listings", defaulted to Yes/On).

* **Flow B: Adding a Listing (Owner or Collaborator [if enabled])**
  * ... (Steps 1-4 as before: Navigate, Click Add, Paste URL, Import) ...
  * *(App Magic: Parsing Happens)*
  * **Graceful Fallback:** The listing appears in the "Potential Listings" table.
    * If scraping *succeeds*, data (Image, Price estimate, Beds, Baths, Key Amenities, potential Geo) is pre-filled.
    * If scraping *fails* for specific fields, or if the user chose "Manual Entry", those fields will be empty or clearly marked for manual input (e.g., "[Tap to add Price]", "[Set Location]").
    * **Manual Input:** Users can click on these fields to manually enter/correct the Price, Bed/Bath count, select amenities from a list, or add notes.
  * **Manual Geo-tagging:** If geo-data wasn't scraped or needs correction, an "Add/Edit Location" button allows the user to drop/move a pin on a map for that listing.

* **Flow C: Inviting Collaborators (Trip Owner)** (Unchanged from previous refinement)
  * ... Generates unique link, Owner shares it ... Owner can control collaborator add permissions from the dashboard.

* **Flow D: Collaborating & Voting/Liking (Collaborator — signed-in dashboard)**
  * Collaborator uses the trip dashboard while signed in (invitation / Clerk).
  * Collaborator views the table of potential listings.
  * **Liking:** Each listing row has a "Like" control. A user can like *multiple* listings; toggling removes the like.
  * The display updates to show like counts and who liked each listing.
  * **Note:** Dashboard **likes** and **published public votes** (see Flow G) are different systems. Likes are for authenticated collaborators on the main trip UI; published votes are for guests on `/share/<token>` and are stored as `TripVote`.

* **Flow E: Managing Listings (Trip Owner)**
  * ... (Delete functions as before) ...
  * **Rejecting:** Clicking "Reject" moves the listing to the "Rejected Listings" table. This is the mechanism used if a listing becomes unavailable or is simply vetoed by the Owner. It remains visible for reference but cannot be liked.
  * *(Optional):* An Owner might also be able to "Un-reject" a listing.

* **Flow F: Viewing Listings on a Map** (Unchanged)
  * Map view shows pins based on scraped or manually entered geo-data.

**4. Key Data Points to Display/Manage (Updates Highlighted):**

* **Trip:** Name, Location, Dates, # People, Owner, Unique Invite Link, Collaborator Add Permission Setting.
* **Listing:** Source URL, Property Name/Title, **Price (clearly labeled, e.g., "Price (approx.)", editable/manual entry prioritized)**, Bed Count, Bedroom Count, Key Amenities (list/icons, potentially editable), Main Image URL, Geolocation (Lat/Long, manually settable), **Like Count**, **Who Liked (list of names)**, Status (Potential/Rejected), Manually Entered Fields (flags or distinct display).

**5. Visual Components (Updates Highlighted):**

* **Trip Dashboard:**
  * ... (Header, Invite, Add Listing, View Toggle as before) ...
  * *New:* Collaborator Permission setting (for Owner).
  * **Potential Listings Table:** Columns for Image, Details, **Price (editable field prominent)**, **Likes (Count + Who)**, Action Buttons (**Like** [for all], Reject/Delete [Owner only]). Clear indicators for manually entered vs. scraped data might be useful.
  * **Rejected Listings Table:** Similar structure, visually distinct (e.g., greyed out), no Like/Reject buttons (maybe "Un-reject" for Owner).
  * **(Optional) Map View:** (Unchanged)

**6. Real-time Collaboration:**

* The user experience goal is for actions (adding listings, liking, rejecting) performed by one user to reflect automatically and quickly for all other users currently viewing the same trip dashboard, enhancing the feeling of live collaboration.

**7. Published trip voting (public share link)**

*Simple version:* The owner turns on a public link. Guests open it without logging in, choose who they are on the list (or add their name), click one house as their vote, and can change their mind later. The owner can close voting, pull the page down, or rotate the link if the old one leaked.

* **Route and access:** `GET /share/<token>` (`<token>` is a UUID on `TripShare`). Middleware marks `/share/*` as public so Clerk does not block the page. If the trip is unpublished or the token was rotated, the old URL shows a clear “not live” state instead of trip data.

* **Owner UI (trip sidebar):** Two cards:
  * **Voting** — Publish/unpublish the page, open/close voting, allow or disallow guest-submitted listing URLs (`allowGuestSuggestions`), copy the link, open the public page in a new tab, and rotate the token (previous links stop working).
  * **Guests** — Manage the **trip team** (owner, collaborators) and the **guest list** used on the public page: add names, remove guests, invite collaborators by email, and see who has voted when that data is loaded. Helper copy explains that guests may add themselves on the public page if their name is missing.

* **Guest flow on the public page:**
  1. **Choose your name** — Pick an existing guest row the owner added, or add a new name. Display names are **unique per trip** (enforced in the database).
  2. **Session on device** — After a name is chosen, the app stores `guestId` and display name in `localStorage` under `housevote_published_guest_<tripId>` so returning to the same link remembers the voter. Another device or cleared storage = treat as a new person (new `TripGuest` row when they submit a name again).
  3. **Voting rules** — At most **one active vote per guest** (`TripVote` is unique on `[tripId, guestId]`). Choosing a different listing **moves** the vote; many guests may vote for the **same** listing. If voting is **closed**, the UI should not allow new vote changes (server actions enforce this).
  4. **Optional listing URL** — If the owner enabled guest suggestions, the guest can paste a rental URL; import runs like other listing imports and ties the listing to the guest where applicable (`Listing.addedByGuestId`).

* **What guests see:** Listing cards show vote counts and voter names for the published flow. A single **current winner** (or leading listing) highlight may appear on the top card instead of a separate global leaderboard, depending on the current UI.

* **Listings and votes:** Rejecting a listing (owner) removes it from contention; vote rows for that listing are cleared so tallies stay consistent.

* **Trust model:** The share URL is an **unauthenticated capability URL**. Anyone with it can vote as any **name** on the list or add a new name until duplicates collide. Rotating the link is the primary mitigation if a link is overshared.

* **Implementation pointers:** Server mutations live in `src/features/trips/actions/publishedTripActions.ts`; reads and share helpers in `src/features/trips/publishedDb.ts`; public UI in `src/features/trips/components/PublishedTripPageClient.tsx`. The guest session hook must use a **stable** `useSyncExternalStore` snapshot (e.g. raw `localStorage` string, parse in `useMemo`) so Next.js does not hit hydration mismatches or update loops.

This revised blueprint incorporates your feedback, focusing on flexibility (manual entry), a clear (but lightweight) collaboration model (named sessions, multiple likes), published voting for non-signed-in guests, and using existing mechanisms (reject) for handling unavailable listings.
