import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AgencyNotFoundException } from '../../agencies/exceptions/agencies.exceptions.js';
import { AgenciesRepository } from '../../agencies/repositories/agencies.repository.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { UserStatus } from '../../users/users.enums.js';
import { StrikesRepository } from '../repositories/strikes.repository.js';
import {
  hiddenUntil,
  ProviderKind,
  SanctionedProvider,
  SanctionLevel,
  sanctionLevel,
} from '../sanctions.js';

export interface SanctionOutcome {
  userId: string;
  activeStrikes: number;
  level: SanctionLevel;
  hiddenUntil: Date | null;
}

interface ProviderAccount {
  userId: string;
  hiddenUntil: Date | null;
}

@Injectable()
export class StrikePenaltiesService {
  constructor(
    private readonly strikes: StrikesRepository,
    private readonly guides: GuidesRepository,
    private readonly agencies: AgenciesRepository,
    private readonly users: UsersRepository,
    private readonly settings: SettingsService,
  ) {}

  async apply(
    provider: SanctionedProvider,
    now: Date,
    manager: EntityManager,
  ): Promise<SanctionOutcome> {
    const account = await this.accountOf(provider, manager);
    const [toHide, toSuspend, hiddenDays, activeStrikes] = await Promise.all([
      this.settings.getNumber(SettingKey.STRIKES_TO_HIDE),
      this.settings.getNumber(SettingKey.STRIKES_TO_SUSPEND),
      this.settings.getNumber(SettingKey.STRIKE_HIDDEN_DAYS),
      this.strikes.countActive(provider, now, manager),
    ]);
    const level = sanctionLevel(activeStrikes, toHide, toSuspend);

    if (level === SanctionLevel.SUSPENDED) {
      await this.users.updateStatus(
        account.userId,
        UserStatus.SUSPENDED,
        manager,
      );
    }

    let hidden = account.hiddenUntil;
    if (level === SanctionLevel.HIDDEN) {
      hidden = hiddenUntil(account.hiddenUntil, now, hiddenDays);
      if (provider.kind === ProviderKind.GUIDE) {
        await this.guides.hideUntil(provider.id, hidden, manager);
      } else {
        await this.agencies.hideUntil(provider.id, hidden, manager);
      }
    }

    return {
      userId: account.userId,
      activeStrikes,
      level,
      hiddenUntil: hidden && hidden > now ? hidden : null,
    };
  }

  private async accountOf(
    provider: SanctionedProvider,
    manager: EntityManager,
  ): Promise<ProviderAccount> {
    if (provider.kind === ProviderKind.GUIDE) {
      const guide = await this.guides.findPlainById(provider.id, manager);
      if (!guide) throw new GuideNotFoundException();
      return guide;
    }
    const agency = await this.agencies.findPlainById(provider.id, manager);
    if (!agency) throw new AgencyNotFoundException();
    return agency;
  }
}
