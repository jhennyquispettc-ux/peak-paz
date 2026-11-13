import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import {
  addDays,
  laPazInstant,
  weekdayOf,
} from '../../../common/time/la-paz-time.js';
import { todayInLaPaz } from '../../../common/verification/verification-documents.js';
import { toMinutes } from '../../routes/services/itinerary.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { AvailabilitySlotDto } from '../dto/availability-slot.dto.js';
import {
  AvailableDateDto,
  CreateAvailableDateDto,
} from '../dto/available-date.dto.js';
import { CommitmentDto, CreateCommitmentDto } from '../dto/commitment.dto.js';
import { GuideScheduleDto } from '../dto/guide-schedule.dto.js';
import { GuideAvailability } from '../entities/guide-availability.entity.js';
import { GuideAvailableDate } from '../entities/guide-available-date.entity.js';
import { GuideCommitment } from '../entities/guide-commitment.entity.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';
import { GuideNotFoundException } from '../exceptions/guides.exceptions.js';
import { AvailabilityMode } from '../guides.enums.js';
import {
  busyWindow,
  GuidesRepository,
} from '../repositories/guides.repository.js';

interface TimeWindow {
  timeFrom: string;
  timeTo: string;
}

export interface AvailableWindow {
  date: string;
  timeFrom: string;
  timeTo: string;
}

export function findWindowProblem(
  windows: (TimeWindow & { group: string | number })[],
): string | null {
  if (windows.some((w) => toMinutes(w.timeFrom) >= toMinutes(w.timeTo))) {
    return 'INVALID_TIME_RANGE';
  }
  const groups = new Map<string | number, TimeWindow[]>();
  for (const window of windows) {
    groups.set(window.group, [...(groups.get(window.group) ?? []), window]);
  }
  for (const sameGroup of groups.values()) {
    const sorted = [...sameGroup].sort(
      (a, b) => toMinutes(a.timeFrom) - toMinutes(b.timeFrom),
    );
    for (let index = 1; index < sorted.length; index++) {
      if (
        toMinutes(sorted[index].timeFrom) < toMinutes(sorted[index - 1].timeTo)
      ) {
        return 'OVERLAPPING_SLOTS';
      }
    }
  }
  return null;
}

export function findSlotProblem(slots: AvailabilitySlotDto[]): string | null {
  return findWindowProblem(
    slots.map((slot) => ({
      timeFrom: slot.timeFrom,
      timeTo: slot.timeTo,
      group: slot.weekday,
    })),
  );
}

const WINDOW_MESSAGES: Record<string, string> = {
  INVALID_TIME_RANGE: 'Each window must start before it ends.',
  OVERLAPPING_SLOTS: 'Two windows of the same day overlap.',
};

function windowError(problem: string): BadRequestException {
  return new BadRequestException({
    error: problem,
    message: WINDOW_MESSAGES[problem],
  });
}

@Injectable()
export class GuideAvailabilityService {
  constructor(
    private readonly guides: GuidesRepository,
    @InjectRepository(GuideAvailability)
    private readonly slots: Repository<GuideAvailability>,
    @InjectRepository(GuideAvailableDate)
    private readonly availableDates: Repository<GuideAvailableDate>,
    @InjectRepository(GuideCommitment)
    private readonly commitments: Repository<GuideCommitment>,
    private readonly settings: SettingsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getSchedule(userId: string): Promise<GuideScheduleDto> {
    const profile = await this.findProfile(userId);
    const [slots, availableDates, commitments] = await Promise.all([
      this.slots.find({
        where: { guideProfileId: profile.id },
        order: { weekday: 'ASC', timeFrom: 'ASC' },
      }),
      this.availableDates.find({
        where: {
          guideProfileId: profile.id,
          date: MoreThanOrEqual(todayInLaPaz()),
        },
        order: { date: 'ASC', timeFrom: 'ASC' },
      }),
      this.commitments.find({
        where: { guideProfileId: profile.id, endsAt: MoreThan(new Date()) },
        order: { startsAt: 'ASC' },
      }),
    ]);
    return {
      mode: profile.availabilityMode,
      slots: slots.map((slot) => AvailabilitySlotDto.fromEntity(slot)),
      availableDates: availableDates.map((date) =>
        AvailableDateDto.fromEntity(date),
      ),
      commitments: commitments.map((commitment) =>
        CommitmentDto.fromEntity(commitment),
      ),
    };
  }

  async setMode(
    userId: string,
    mode: AvailabilityMode,
  ): Promise<GuideScheduleDto> {
    const profile = await this.findProfile(userId);
    profile.availabilityMode = mode;
    await this.guides.save(profile);
    return this.getSchedule(userId);
  }

  async setSlots(
    userId: string,
    slots: AvailabilitySlotDto[],
  ): Promise<GuideScheduleDto> {
    const problem = findSlotProblem(slots);
    if (problem) throw windowError(problem);
    const profile = await this.findProfile(userId);

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(GuideAvailability);
      await repository.delete({ guideProfileId: profile.id });
      if (slots.length > 0) {
        await repository.insert(
          slots.map((slot) => ({
            weekday: slot.weekday,
            timeFrom: slot.timeFrom,
            timeTo: slot.timeTo,
            guideProfileId: profile.id,
          })),
        );
      }
    });
    return this.getSchedule(userId);
  }

  async addAvailableDate(
    userId: string,
    dto: CreateAvailableDateDto,
  ): Promise<AvailableDateDto> {
    if (dto.date < todayInLaPaz()) {
      throw new BadRequestException({
        error: 'DATE_IN_PAST',
        message: 'The date has already passed.',
      });
    }
    const profile = await this.findProfile(userId);
    const sameDay = await this.availableDates.find({
      where: { guideProfileId: profile.id, date: dto.date },
    });
    const problem = findWindowProblem(
      [...sameDay, dto].map((window) => ({
        timeFrom: window.timeFrom.slice(0, 5),
        timeTo: window.timeTo.slice(0, 5),
        group: dto.date,
      })),
    );
    if (problem) throw windowError(problem);

    const saved = await this.availableDates.save(
      this.availableDates.create({
        guideProfileId: profile.id,
        date: dto.date,
        timeFrom: dto.timeFrom,
        timeTo: dto.timeTo,
      }),
    );
    return AvailableDateDto.fromEntity(saved);
  }

  async removeAvailableDate(userId: string, id: string): Promise<void> {
    const profile = await this.findProfile(userId);
    const result = await this.availableDates.delete({
      id,
      guideProfileId: profile.id,
    });
    if (!result.affected) {
      throw new NotFoundException({
        error: 'AVAILABLE_DATE_NOT_FOUND',
        message: 'Available date not found.',
      });
    }
  }

  async addCommitment(
    userId: string,
    dto: CreateCommitmentDto,
  ): Promise<CommitmentDto> {
    const startsAt = laPazInstant(dto.dateFrom, dto.timeFrom ?? '00:00');
    const endsAt = dto.timeTo
      ? laPazInstant(dto.dateTo, dto.timeTo)
      : laPazInstant(addDays(dto.dateTo, 1), '00:00');
    if (startsAt >= endsAt) {
      throw new BadRequestException({
        error: 'INVALID_DATE_RANGE',
        message: 'The commitment must start before it ends.',
      });
    }
    if (endsAt <= new Date()) {
      throw new BadRequestException({
        error: 'DATE_IN_PAST',
        message: 'The commitment has already ended.',
      });
    }

    const profile = await this.findProfile(userId);
    const buffer = await this.settings.getNumber(
      SettingKey.SCHEDULE_BUFFER_MIN,
    );
    const busy = busyWindow({ startsAt, endsAt }, buffer);
    if (
      await this.guides.hasBlockingBooking(
        profile.id,
        busy.busyFrom,
        busy.busyUntil,
      )
    ) {
      throw new ConflictException({
        error: 'COMMITMENT_OVERLAPS_BOOKING',
        message:
          'This commitment clashes with a booking you already accepted on Peak Paz.',
      });
    }

    const saved = await this.commitments.save(
      this.commitments.create({
        guideProfileId: profile.id,
        title: dto.title,
        startsAt,
        endsAt,
        notes: dto.notes ?? null,
      }),
    );
    return CommitmentDto.fromEntity(saved);
  }

  async removeCommitment(userId: string, id: string): Promise<void> {
    const profile = await this.findProfile(userId);
    const result = await this.commitments.delete({
      id,
      guideProfileId: profile.id,
    });
    if (!result.affected) {
      throw new NotFoundException({
        error: 'COMMITMENT_NOT_FOUND',
        message: 'Commitment not found.',
      });
    }
  }

  async windowsBetween(
    profile: GuideProfile,
    from: string,
    to: string,
  ): Promise<AvailableWindow[]> {
    if (profile.availabilityMode === AvailabilityMode.BY_DATE) {
      const dates = await this.availableDates.find({
        where: { guideProfileId: profile.id, date: Between(from, to) },
        order: { date: 'ASC', timeFrom: 'ASC' },
      });
      return dates.map((date) => {
        const dto = AvailableDateDto.fromEntity(date);
        return { date: dto.date, timeFrom: dto.timeFrom, timeTo: dto.timeTo };
      });
    }

    const slots = await this.slots.find({
      where: { guideProfileId: profile.id },
      order: { timeFrom: 'ASC' },
    });
    const windows: AvailableWindow[] = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const weekday = weekdayOf(date);
      for (const slot of slots.filter((item) => item.weekday === weekday)) {
        windows.push({
          date,
          timeFrom: slot.timeFrom.slice(0, 5),
          timeTo: slot.timeTo.slice(0, 5),
        });
      }
    }
    return windows;
  }

  commitmentsBetween(
    profileId: string,
    from: Date,
    until: Date,
  ): Promise<GuideCommitment[]> {
    return this.commitments
      .createQueryBuilder('commitment')
      .where('commitment.guideProfileId = :profileId', { profileId })
      .andWhere('commitment.startsAt < :until', { until })
      .andWhere('commitment.endsAt > :from', { from })
      .orderBy('commitment.startsAt', 'ASC')
      .getMany();
  }

  async findProfile(userId: string): Promise<GuideProfile> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    return profile;
  }
}
