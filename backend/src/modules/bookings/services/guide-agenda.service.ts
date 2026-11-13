import { BadRequestException, Injectable } from '@nestjs/common';
import { addDays, laPazInstant } from '../../../common/time/la-paz-time.js';
import { CommitmentDto } from '../../guides/dto/commitment.dto.js';
import { GuideAvailabilityService } from '../../guides/services/guide-availability.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { GuideAgendaDto } from '../dto/guide-agenda.dto.js';
import { BookingsRepository } from '../repositories/bookings.repository.js';

const MAX_RANGE_DAYS = 62;

@Injectable()
export class GuideAgendaService {
  constructor(
    private readonly availability: GuideAvailabilityService,
    private readonly bookings: BookingsRepository,
    private readonly settings: SettingsService,
  ) {}

  async get(userId: string, from: string, to: string): Promise<GuideAgendaDto> {
    if (from > to || addDays(from, MAX_RANGE_DAYS) < to) {
      throw new BadRequestException({
        error: 'INVALID_DATE_RANGE',
        message: `The range must go forward and cover at most ${MAX_RANGE_DAYS} days.`,
      });
    }
    const profile = await this.availability.findProfile(userId);
    const rangeStart = laPazInstant(from, '00:00');
    const rangeEnd = laPazInstant(addDays(to, 1), '00:00');

    const [windows, commitments, bookings, bufferMinutes] = await Promise.all([
      this.availability.windowsBetween(profile, from, to),
      this.availability.commitmentsBetween(profile.id, rangeStart, rangeEnd),
      this.bookings.findInRange(profile.id, rangeStart, rangeEnd),
      this.settings.getNumber(SettingKey.SCHEDULE_BUFFER_MIN),
    ]);

    return {
      mode: profile.availabilityMode,
      from,
      to,
      bufferMinutes,
      availableWindows: windows,
      commitments: commitments.map((commitment) =>
        CommitmentDto.fromEntity(commitment),
      ),
      bookings: bookings.map((booking) => ({
        id: booking.id,
        code: booking.code,
        status: booking.status,
        routeNameEs: booking.route!.nameEs,
        peopleCount: booking.peopleCount,
        startsAt: laPazInstant(booking.tourDate!, booking.startTime!),
        endsAt:
          booking.endsAt ??
          laPazInstant(
            addDays(booking.tourDate!, booking.route!.days),
            '00:00',
          ),
      })),
    };
  }
}
