import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { todayInLaPaz } from '../../../common/verification/verification-documents.js';
import { toMinutes } from '../../routes/services/itinerary.service.js';
import { AvailabilitySlotDto } from '../dto/availability-slot.dto.js';
import {
  BlockedDateDto,
  CreateBlockedDateDto,
} from '../dto/blocked-date.dto.js';
import { GuideScheduleDto } from '../dto/guide-schedule.dto.js';
import { GuideAvailability } from '../entities/guide-availability.entity.js';
import { GuideBlockedDate } from '../entities/guide-blocked-date.entity.js';
import { GuideProfile } from '../entities/guide-profile.entity.js';
import { GuideNotFoundException } from '../exceptions/guides.exceptions.js';
import { GuidesRepository } from '../repositories/guides.repository.js';

export function findSlotProblem(slots: AvailabilitySlotDto[]): string | null {
  if (
    slots.some((slot) => toMinutes(slot.timeFrom) >= toMinutes(slot.timeTo))
  ) {
    return 'INVALID_TIME_RANGE';
  }
  for (let weekday = 0; weekday <= 6; weekday++) {
    const sameDay = slots
      .filter((slot) => slot.weekday === weekday)
      .sort((a, b) => toMinutes(a.timeFrom) - toMinutes(b.timeFrom));
    for (let index = 1; index < sameDay.length; index++) {
      if (
        toMinutes(sameDay[index].timeFrom) <
        toMinutes(sameDay[index - 1].timeTo)
      ) {
        return 'OVERLAPPING_SLOTS';
      }
    }
  }
  return null;
}

const SLOT_MESSAGES: Record<string, string> = {
  INVALID_TIME_RANGE: 'Each slot must start before it ends.',
  OVERLAPPING_SLOTS: 'Two slots of the same day overlap.',
};

@Injectable()
export class GuideAvailabilityService {
  constructor(
    private readonly guides: GuidesRepository,
    @InjectRepository(GuideAvailability)
    private readonly slots: Repository<GuideAvailability>,
    @InjectRepository(GuideBlockedDate)
    private readonly blockedDates: Repository<GuideBlockedDate>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getSchedule(userId: string): Promise<GuideScheduleDto> {
    const profile = await this.findProfile(userId);
    const [slots, blockedDates] = await Promise.all([
      this.slots.find({
        where: { guideProfileId: profile.id },
        order: { weekday: 'ASC', timeFrom: 'ASC' },
      }),
      this.blockedDates.find({
        where: { guideProfileId: profile.id },
        order: { dateFrom: 'ASC' },
      }),
    ]);
    return {
      slots: slots.map((slot) => AvailabilitySlotDto.fromEntity(slot)),
      blockedDates: blockedDates.map((blocked) =>
        BlockedDateDto.fromEntity(blocked),
      ),
    };
  }

  async setSlots(
    userId: string,
    slots: AvailabilitySlotDto[],
  ): Promise<GuideScheduleDto> {
    const problem = findSlotProblem(slots);
    if (problem) {
      throw new BadRequestException({
        error: problem,
        message: SLOT_MESSAGES[problem],
      });
    }
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

  async addBlockedDate(
    userId: string,
    dto: CreateBlockedDateDto,
  ): Promise<BlockedDateDto> {
    if (dto.dateFrom > dto.dateTo) {
      throw new BadRequestException({
        error: 'INVALID_DATE_RANGE',
        message: 'dateFrom must be on or before dateTo.',
      });
    }
    if (dto.dateTo < todayInLaPaz()) {
      throw new BadRequestException({
        error: 'BLOCKED_DATE_IN_PAST',
        message: 'The blocked range has already passed.',
      });
    }
    const profile = await this.findProfile(userId);
    const saved = await this.blockedDates.save(
      this.blockedDates.create({
        guideProfileId: profile.id,
        dateFrom: dto.dateFrom,
        dateTo: dto.dateTo,
        reason: dto.reason ?? null,
      }),
    );
    return BlockedDateDto.fromEntity(saved);
  }

  async removeBlockedDate(userId: string, blockedId: string): Promise<void> {
    const profile = await this.findProfile(userId);
    const result = await this.blockedDates.delete({
      id: blockedId,
      guideProfileId: profile.id,
    });
    if (!result.affected) {
      throw new NotFoundException({
        error: 'BLOCKED_DATE_NOT_FOUND',
        message: 'Blocked date not found.',
      });
    }
  }

  private async findProfile(userId: string): Promise<GuideProfile> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    return profile;
  }
}
