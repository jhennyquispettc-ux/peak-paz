import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { StrikeDto } from '../dto/strike.dto.js';
import { StrikesRepository } from '../repositories/strikes.repository.js';
import { addMonths, ProviderKind, SanctionedProvider } from '../sanctions.js';
import { StrikeReason } from '../strikes.enums.js';
import {
  SanctionOutcome,
  StrikePenaltiesService,
} from './strike-penalties.service.js';

export interface StrikeToIssue {
  provider: SanctionedProvider;
  subjectId: string;
  reason: StrikeReason;
  weight: number;
  adminId: string;
}

export interface IssuedStrike {
  strikeId: string;
  sanction: SanctionOutcome;
}

@Injectable()
export class StrikeIssuerService {
  constructor(
    private readonly strikes: StrikesRepository,
    private readonly penalties: StrikePenaltiesService,
    private readonly settings: SettingsService,
  ) {}

  async issue(
    strike: StrikeToIssue,
    now: Date,
    manager: EntityManager,
  ): Promise<IssuedStrike> {
    const validityMonths = await this.settings.getNumber(
      SettingKey.STRIKE_VALIDITY_MONTHS,
    );
    const byGuide = strike.provider.kind === ProviderKind.GUIDE;
    const created = await this.strikes.create(
      {
        bookingId: byGuide ? strike.subjectId : null,
        groupDepartureId: byGuide ? null : strike.subjectId,
        reason: strike.reason,
        weight: strike.weight,
        expiresAt: addMonths(now, validityMonths),
        assignedById: strike.adminId,
      },
      manager,
    );
    const sanction = await this.penalties.apply(strike.provider, now, manager);
    return { strikeId: created.id, sanction };
  }

  countActive(
    provider: SanctionedProvider,
    now: Date,
    manager?: EntityManager,
  ): Promise<number> {
    return this.strikes.countActive(provider, now, manager);
  }

  async findDto(strikeId: string): Promise<StrikeDto | null> {
    const strike = await this.strikes.findById(strikeId);
    return strike ? StrikeDto.fromEntity(strike) : null;
  }
}
