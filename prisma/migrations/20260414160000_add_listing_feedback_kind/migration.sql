-- CreateEnum
CREATE TYPE "ListingCommentKind" AS ENUM ('COMMENT', 'PRO', 'CON');

-- AlterTable
ALTER TABLE "ListingComment" ADD COLUMN     "kind" "ListingCommentKind" NOT NULL DEFAULT 'COMMENT';
