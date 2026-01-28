import { Inject, Injectable } from '@nestjs/common';
import {
  InterfaceReadingReportRepository,
  NoveltyStatsReport,
} from '../../../domain/contracts/reading-report.interface.repository';

@Injectable()
export class GetNoveltyStatsReportUseCase {
  constructor(
    @Inject('ReadingReportRepository')
    private readonly reportRepository: InterfaceReadingReportRepository,
  ) {}

  async execute(month: string): Promise<NoveltyStatsReport[]> {
    if (!month) {
      throw new Error('Month is required (YYYY-MM)');
    }
    return this.reportRepository.findNoveltyStats(month);
  }
}
