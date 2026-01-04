import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserToken } from './entities/user-token.entity';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    @InjectRepository(UserToken)
    private userTokenRepository: Repository<UserToken>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    this.logger.debug('Running token cleanup job...');

    const result = await this.userTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.debug(`Deleted ${result.affected} expired tokens.`);
  }
}
