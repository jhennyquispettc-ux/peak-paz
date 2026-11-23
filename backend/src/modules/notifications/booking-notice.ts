import { Booking } from '../bookings/entities/booking.entity.js';
import type { NotificationData } from './templates.js';

export function bookingNotice(
  booking: Booking,
  extra: NotificationData = {},
): NotificationData {
  const departure = booking.groupDeparture;
  return {
    bookingId: booking.id,
    code: booking.code,
    route: (booking.route ?? departure?.route)?.nameEs ?? '',
    date: booking.tourDate ?? departure?.departureDate ?? '',
    ...extra,
  };
}

export function providerUserIdOf(booking: Booking): string | null {
  return (
    booking.guideProfile?.userId ??
    booking.groupDeparture?.agency?.userId ??
    null
  );
}
