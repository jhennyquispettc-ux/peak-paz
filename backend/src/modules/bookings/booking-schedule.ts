import { addDays, laPazInstant } from '../../common/time/la-paz-time.js';
import { Booking } from './entities/booking.entity.js';

export function bookingStartsAt(booking: Booking): Date {
  const departure = booking.groupDeparture;
  return laPazInstant(
    booking.tourDate ?? departure!.departureDate,
    booking.startTime ?? departure!.meetingTime,
  );
}

export function bookingEndsAt(booking: Booking): Date {
  if (booking.endsAt) return booking.endsAt;
  const departure = booking.groupDeparture;
  const tourDate = booking.tourDate ?? departure!.departureDate;
  return laPazInstant(addDays(tourDate, 1), '00:00');
}
