import { currentUser } from '@clerk/nextjs/server';

interface OwnerDetailsResult {
  name: string | null;
  email: string | null;
  image: string | null;
}

export async function getTripOwnerDetails(ownerId: string): Promise<OwnerDetailsResult> {
  try {
    // Fetch the current user from Clerk
    const user = await currentUser();

    // If this is the owner viewing their own trip
    if (user && user.id === ownerId) {
      return {
        name: user.fullName,
        email: user.emailAddresses[0]?.emailAddress || null,
        image: user.imageUrl,
      };
    }

    // TODO: In a more complete implementation, you'd want to fetch the owner's
    // details from your database or Clerk's API using the ownerId

    // Fallback for now
    return {
      name: 'Trip Owner',
      email: null,
      image: null,
    };
  } catch (error) {
    console.error('Error fetching owner details:', error);
    return {
      name: 'Trip Owner',
      email: null,
      image: null,
    };
  }
}