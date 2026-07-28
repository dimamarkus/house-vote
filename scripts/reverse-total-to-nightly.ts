/**
 * One-off maintenance script for the "store nightly, compute totals live"
 * switch.
 *
 * Context: the short-lived "total price" regime (migration
 * 20260728200000_convert_listing_price_to_total_stay) multiplied some dated
 * trips' listing prices by their night count, turning a nightly rate into a
 * stay total. Now that `Listing.price` means "per night" again, those specific
 * rows read too high (they'd get multiplied by nights a second time at display
 * time).
 *
 * We CANNOT reliably tell, from the data alone, which rows were multiplied vs.
 * which are already correct nightly rates (e.g. listings added while a trip had
 * no dates, then dated later — those were never multiplied). So this script is
 * a DRY RUN by default: it prints every dated trip's listings with the nightly
 * value they'd become if divided by the trip's nights. Eyeball it, then re-run
 * with `--apply=<tripId>[,<tripId>...]` to actually divide ONLY the trips you
 * confirm were inflated.
 *
 * Usage (Node 24):
 *   node --experimental-strip-types scripts/reverse-total-to-nightly.ts
 *   node --experimental-strip-types scripts/reverse-total-to-nightly.ts --apply=cmabxd7ot000117sgwzcuj89s
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function parseApplyTripIds(): Set<string> {
  const flag = process.argv.find((arg) => arg.startsWith('--apply='));
  if (!flag) return new Set();
  return new Set(
    flag
      .slice('--apply='.length)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function nightsBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return nights > 0 ? nights : null;
}

async function main() {
  const applyTripIds = parseApplyTripIds();
  const isApplying = applyTripIds.size > 0;

  const trips = await db.trip.findMany({
    where: { startDate: { not: null }, endDate: { not: null } },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      listings: { select: { id: true, title: true, price: true } },
    },
  });

  for (const trip of trips) {
    const nights = nightsBetween(trip.startDate, trip.endDate);
    if (!nights) continue;

    const willApply = applyTripIds.has(trip.id);
    console.log(
      `\nTrip ${trip.id} — "${trip.name}" (${nights} nights)` +
        (isApplying ? (willApply ? '  [APPLYING]' : '  [skipped]') : ''),
    );

    for (const listing of trip.listings) {
      if (listing.price === null || listing.price <= 0) continue;
      const nightly = Math.max(1, Math.round(listing.price / nights));
      console.log(
        `  ${listing.id}  ${listing.price} -> ${nightly}/night   ${listing.title}`,
      );

      if (isApplying && willApply) {
        await db.listing.update({
          where: { id: listing.id },
          data: { price: nightly },
        });
      }
    }
  }

  if (!isApplying) {
    console.log(
      '\nDry run only. Re-run with --apply=<tripId>[,<tripId>...] to divide the confirmed trips.',
    );
  }
}

main().finally(() => db.$disconnect());
