import { TripForm } from '@/features/trips/forms/TripForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/ui/shadcn/card';

export default function CreateTripPage() {
  // Could add requireAuth() here if middleware wasn't covering it

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create New Trip</CardTitle>
            <CardDescription>
              Plan your next house hunting adventure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TripForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}