import { laPazInstant } from '../../common/time/la-paz-time.js';
import { Booking } from './entities/booking.entity.js';

export function bookingStartsAt(booking: Booking): Date {
  const departure = booking.groupDeparture;
  return laPazInstant(
    booking.tourDate ?? departure!.departureDate,
    booking.startTime ?? departure!.meetingTime,
  );
}
