'use client';

import { Form } from '@turbodima/ui/form/Form';
import { SearchInput } from '@turbodima/ui/core/SearchInput';
import { Button } from '@turbodima/ui/shadcn/button';
import { Search } from 'lucide-react';

/**
 * Search form component for listings
 * Provides a search input that submits to the admin route
 * @component
 */
export function ListingSearchForm({
  /** Default search value to pre-populate the input */
  defaultValue
}: {
  defaultValue?: string;
}) {
  return (
    <Form
      action="/admin/listings"
      className="flex w-full max-w-sm items-center space-x-2"
      hideSubmitButton={true}
    >
      <div className="flex-grow">
        <SearchInput
          name="query"
          placeholder="Search listings..."
          defaultValue={defaultValue}
        />
      </div>
      <Button type="submit" size="icon">
        <Search className="h-4 w-4" />
      </Button>
    </Form>
  );
}