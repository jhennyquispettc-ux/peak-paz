import { Injectable } from '@nestjs/common';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { AgencyNotFoundException } from '../../agencies/exceptions/agencies.exceptions.js';
import { AgenciesRepository } from '../../agencies/repositories/agencies.repository.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import {
  SanctionsSummaryDto,
  StrikeDto,
  StrikePageDto,
  StrikeQueryDto,
} from '../dto/strike.dto.js';
import {
  StrikeNotActiveException,
  StrikeNotFoundException,
} from '../exceptions/strikes.exceptions.js';
import { StrikesRepository } from '../repositories/strikes.repository.js';
import { ProviderKind, SanctionedProvider } from '../sanctions.js';
import { StrikeStatus } from '../strikes.enums.js';
import { FinesService } from './fines.service.js';

@Injectable()
export class StrikesService {
  constructor(
    private readonly strikes: StrikesRepository,
    private readonly guides: GuidesRepository,
    private readonly agencies: AgenciesRepository,
    private readonly fines: FinesService,
    private readonly settings: SettingsService,
  ) {}

  async list(query: StrikeQueryDto): Promise<StrikePageDto> {
    const provider: SanctionedProvider | undefined = query.guideProfileId
      ? { kind: ProviderKind.GUIDE, id: query.guideProfileId }
      : query.agencyId
        ? { kind: ProviderKind.AGENCY, id: query.agencyId }
        : undefined;
    const [strikes, total] = await this.strikes.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
      provider,
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

  async summaryForGuide(userId: string): Promise<SanctionsSummaryDto> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    return this.summary(
      { kind: ProviderKind.GUIDE, id: profile.id },
      profile.hiddenUntil,
    );
  }

  async summaryForAgency(userId: string): Promise<SanctionsSummaryDto> {
    const agency = await this.agencies.findIdByUserId(userId);
    if (!agency) throw new AgencyNotFoundException();
    return this.summary(
      { kind: ProviderKind.AGENCY, id: agency.id },
      agency.hiddenUntil,
    );
  }

  private async summary(
    provider: SanctionedProvider,
    hiddenUntil: Date | null,
  ): Promise<SanctionsSummaryDto> {
    const now = new Date();
    const [activeStrikes, strikes, pendingFines, toHide, toSuspend] =
      await Promise.all([
        this.strikes.countActive(provider, now),
        this.strikes.findForProvider(provider),
        this.fines.pendingFor(provider),
        this.settings.getNumber(SettingKey.STRIKES_TO_HIDE),
        this.settings.getNumber(SettingKey.STRIKES_TO_SUSPEND),
      ]);
    return {
      activeStrikes,
      strikesToHide: toHide,
      strikesToSuspend: toSuspend,
      hiddenUntil: hiddenUntil && hiddenUntil > now ? hiddenUntil : null,
      pendingFines,
      strikes: strikes.map((strike) => StrikeDto.fromEntity(strike)),
    };
  }
}
