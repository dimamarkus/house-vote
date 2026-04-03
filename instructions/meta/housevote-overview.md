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

* **Flow D: Collaborating & Voting/Liking (Collaborator)**
  * Collaborator clicks the unique link.
  * *(First-time access via link):* Prompt appears: "Enter your name for this trip: [_____]". This name is stored in their browser's local storage/session, specifically associated with *this trip link*, to identify their actions (likes, potentially added listings).
  * Collaborator views the table of potential listings.
  * **Liking:** Each listing row has a "Like" button (e.g., a heart or thumbs-up icon). A user can click "Like" on *multiple* listings they find appealing. Clicking again unlikes it.
  * The display updates (ideally in near real-time) to show the *count* of likes for each listing and *who* liked it (e.g., displaying names/initials of likers next to the like count or in a tooltip).

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

This revised blueprint incorporates your feedback, focusing on flexibility (manual entry), a clear (but lightweight) collaboration model (named sessions, multiple likes), and using existing mechanisms (reject) for handling unavailable listings. This feels like a very usable and well-defined user experience flow!
