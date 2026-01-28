import { Inject, Injectable } from '@nestjs/common';
import {
  InterfaceReadingReportRepository,
  SectorStatsReport,
} from '../../../domain/contracts/reading-report.interface.repository';

@Injectable()
export class GetSectorStatsReportUseCase {
  constructor(
    @Inject('ReadingReportRepository')
    private readonly reportRepository: InterfaceReadingReportRepository,
  ) {}

  async execute(month: string): Promise<SectorStatsReport[]> {
    if (!month) {
      throw new Error('Month is required (YYYY-MM)');
    }
    return this.reportRepository.findSectorStats(month);
  }
}
