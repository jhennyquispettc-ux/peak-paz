import { Injectable } from '@nestjs/common';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import {
  GuideSanctionsDto,
  StrikeDto,
  StrikePageDto,
  StrikeQueryDto,
} from '../dto/strike.dto.js';
import {
  StrikeNotActiveException,
  StrikeNotFoundException,
} from '../exceptions/strikes.exceptions.js';
import { StrikesRepository } from '../repositories/strikes.repository.js';
import { StrikeStatus } from '../strikes.enums.js';
import { FinesService } from './fines.service.js';

@Injectable()
export class StrikesService {
  constructor(
    private readonly strikes: StrikesRepository,
    private readonly guides: GuidesRepository,
    private readonly fines: FinesService,
    private readonly settings: SettingsService,
  ) {}

  async list(query: StrikeQueryDto): Promise<StrikePageDto> {
    const [strikes, total] = await this.strikes.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
      guideProfileId: query.guideProfileId,
    });
    return {
      data: strikes.map((strike) => StrikeDto.fromEntity(strike)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async revert(id: string): Promise<StrikeDto> {
    const strike = await this.strikes.findById(id);
    if (!strike) throw new StrikeNotFoundException();
    if (strike.status !== StrikeStatus.ACTIVE) {
      throw new StrikeNotActiveException();
    }
    strike.status = StrikeStatus.REVERTED;
    await this.strikes.save(strike);
    return StrikeDto.fromEntity(strike);
  }

  async summaryForGuide(userId: string): Promise<GuideSanctionsDto> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    const now = new Date();
    const [activeStrikes, strikes, pendingFines, toHide, toSuspend] =
      await Promise.all([
        this.strikes.countActiveForGuide(profile.id, now),
        this.strikes.findForGuide(profile.id),
        this.fines.pendingForGuide(profile.id),
        this.settings.getNumber(SettingKey.STRIKES_TO_HIDE),
        this.settings.getNumber(SettingKey.STRIKES_TO_SUSPEND),
      ]);
    return {
      activeStrikes,
      strikesToHide: toHide,
      strikesToSuspend: toSuspend,
      hiddenUntil:
        profile.hiddenUntil && profile.hiddenUntil > now
          ? profile.hiddenUntil
          : null,
      pendingFines,
      strikes: strikes.map((strike) => StrikeDto.fromEntity(strike)),
    };
  }
}
