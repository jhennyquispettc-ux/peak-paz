import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { UserStatus } from '../../users/users.enums.js';
import { StrikesRepository } from '../repositories/strikes.repository.js';
import { hiddenUntil, SanctionLevel, sanctionLevel } from '../sanctions.js';

export interface SanctionOutcome {
  activeStrikes: number;
  level: SanctionLevel;
  hiddenUntil: Date | null;
}

@Injectable()
export class StrikePenaltiesService {
  constructor(
    private readonly strikes: StrikesRepository,
    private readonly guides: GuidesRepository,
    private readonly users: UsersRepository,
    private readonly settings: SettingsService,
  ) {}

  async apply(
    guideProfileId: string,
    now: Date,
    manager: EntityManager,
  ): Promise<SanctionOutcome> {
    const guide = await this.guides.findPlainById(guideProfileId, manager);
    if (!guide) throw new GuideNotFoundException();

    const [toHide, toSuspend, hiddenDays, activeStrikes] = await Promise.all([
      this.settings.getNumber(SettingKey.STRIKES_TO_HIDE),
      this.settings.getNumber(SettingKey.STRIKES_TO_SUSPEND),
      this.settings.getNumber(SettingKey.STRIKE_HIDDEN_DAYS),
      this.strikes.countActiveForGuide(guideProfileId, now, manager),
    ]);
    const level = sanctionLevel(activeStrikes, toHide, toSuspend);

    if (level === SanctionLevel.SUSPENDED) {
      await this.users.updateStatus(
        guide.userId,
        UserStatus.SUSPENDED,
        manager,
      );
    }

    let hidden = guide.hiddenUntil;
    if (level === SanctionLevel.HIDDEN) {
      hidden = hiddenUntil(guide.hiddenUntil, now, hiddenDays);
      await this.guides.hideUntil(guideProfileId, hidden, manager);
    }

    return {
      activeStrikes,
      level,
      hiddenUntil: hidden && hidden > now ? hidden : null,
    };
  }
}
