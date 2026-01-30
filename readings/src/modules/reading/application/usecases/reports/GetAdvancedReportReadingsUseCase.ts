import { Injectable } from '@nestjs/common';
import {
  AdvancedReportReadingsResponse,
  InterfaceReadingReportRepository,
} from '../../../domain/contracts/reading-report.interface.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class GetAdvancedReportReadingsUseCase {
  constructor(
    @Inject('ReadingReportRepository')
    private readonly reportRepository: InterfaceReadingReportRepository,
  ) {}

  async execute(month: string): Promise<AdvancedReportReadingsResponse[]> {
    if (!month) {
      throw new Error('Month is required');
    }
    const report: AdvancedReportReadingsResponse[] =
      await this.reportRepository.findAdvancedReportReadings(month);
    return report;
  }
}
