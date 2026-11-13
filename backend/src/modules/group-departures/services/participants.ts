import { BookingSource, BookingStatus } from '../../bookings/bookings.enums.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { AgencyDepartureDto, DepartureDto } from '../dto/departure.dto.js';
import { GroupDeparture } from '../entities/group-departure.entity.js';
import { SEAT_HOLDING_STATUSES } from '../repositories/group-departures.repository.js';

function contactOf(booking: Booking): string | null {
  if (booking.source === BookingSource.MANUAL) return booking.manualContact;
  if (booking.status !== BookingStatus.CONFIRMED || !booking.tourist) {
    return null;
  }
  return [booking.tourist.email, booking.tourist.phone]
    .filter(Boolean)
    .join(', ');
}

export function toAgencyDepartureDto(
  departure: GroupDeparture,
  bookings: Booking[],
): AgencyDepartureDto {
  const seats = bookings
    .filter((booking) => SEAT_HOLDING_STATUSES.includes(booking.status))
    .reduce((total, booking) => total + booking.peopleCount, 0);
  return Object.assign(DepartureDto.fromEntity(departure, seats), {
    participants: bookings.map((booking) => ({
      bookingId: booking.id,
      code: booking.code,
      source: booking.source,
      status: booking.status,
      peopleCount: booking.peopleCount,
      name: booking.tourist
        ? `${booking.tourist.firstName} ${booking.tourist.lastName}`
        : 'Reserva manual',
      contact: contactOf(booking),
    })),
  });
}
