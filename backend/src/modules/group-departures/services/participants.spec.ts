import { BookingSource, BookingStatus } from '../../bookings/bookings.enums.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { Route } from '../../routes/entities/route.entity.js';
import { Agency } from '../../agencies/entities/agency.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { GroupDeparture } from '../entities/group-departure.entity.js';
import { GroupDepartureStatus } from '../group-departures.enums.js';
import { toAgencyDepartureDto } from './participants.js';

const departure = Object.assign(new GroupDeparture(), {
  id: 'departure-1',
  route: Object.assign(new Route(), {
    id: 'route-1',
    slug: 'muela',
    nameEs: 'Muela',
    days: 1,
  }),
  agency: Object.assign(new Agency(), {
    id: 'agency-1',
    legalName: 'Andes',
    ratingAverage: 0,
  }),
  departureDate: '2026-12-12',
  meetingTime: '07:00:00',
  meetingPoint: 'Plaza',
  guideName: 'Juan',
  pricePerPerson: 100,
  minPeople: 3,
  maxPeople: 8,
  status: GroupDepartureStatus.PUBLISHED,
  closesAt: new Date('2026-12-10T11:00:00Z'),
});

function booking(
  status: BookingStatus,
  source: BookingSource,
  people: number,
): Booking {
  return Object.assign(new Booking(), {
    id: `${status}-${source}`,
    code: 'PP-AAAA2222',
    status,
    source,
    peopleCount: people,
    manualContact: source === BookingSource.MANUAL ? 'Carlos, 70000000' : null,
    tourist:
      source === BookingSource.WEB
        ? Object.assign(new User(), {
            firstName: 'Ana',
            lastName: 'Demo',
            email: 'ana@example.com',
            phone: '+591 70000000',
          })
        : null,
  });
}

describe('toAgencyDepartureDto', () => {
  it('counts held seats and shows contact data only for paid sign ups', () => {
    const dto = toAgencyDepartureDto(departure, [
      booking(BookingStatus.CONFIRMED, BookingSource.WEB, 2),
      booking(BookingStatus.ACCEPTED, BookingSource.WEB, 1),
      booking(BookingStatus.EXPIRED, BookingSource.WEB, 4),
      booking(BookingStatus.CONFIRMED, BookingSource.MANUAL, 1),
    ]);

    expect(dto.seatsTaken).toBe(4);
    expect(dto.seatsLeft).toBe(4);
    expect(dto.participants.map((item) => item.contact)).toEqual([
      'ana@example.com, +591 70000000',
      null,
      null,
      'Carlos, 70000000',
    ]);
    expect(dto.participants[3].name).toBe('Reserva manual');
  });
});
