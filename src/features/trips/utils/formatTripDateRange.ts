import { format } from 'date-fns';

type TripDateValue = Date | string | null | undefined;

function parseTripDate(value: TripDateValue): Date | null {
  if (!value) {
    return null;
  }

  const parsedDate = value instanceof Date ? value : new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function formatTripDate(value: TripDateValue): string | null {
  const parsedDate = parseTripDate(value);

  return parsedDate ? format(parsedDate, 'MMM d, yyyy') : null;
}

export function formatTripDateRange(
  startDate: TripDateValue,
  endDate: TripDateValue
): string | null {
  const formattedStartDate = formatTripDate(startDate);
  const formattedEndDate = formatTripDate(endDate);

  if (formattedStartDate && formattedEndDate) {
    return `${formattedStartDate} - ${formattedEndDate}`;
  }

  if (formattedStartDate) {
    return `Starts ${formattedStartDate}`;
  }

  if (formattedEndDate) {
    return `Ends ${formattedEndDate}`;
  }

  return null;
}
