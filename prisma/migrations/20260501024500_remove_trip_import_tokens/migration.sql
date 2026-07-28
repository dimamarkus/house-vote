-- Drop the legacy Chrome extension shared-token table.
-- The extension now authenticates with Clerk and imports through /api/extension/import-listing.
DROP TABLE IF EXISTS "TripImportToken";
