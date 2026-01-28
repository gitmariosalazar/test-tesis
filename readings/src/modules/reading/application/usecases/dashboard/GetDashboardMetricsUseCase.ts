import { Inject, Injectable } from '@nestjs/common';
import {
  InterfaceReadingReportRepository,
  DashboardMetrics,
} from '../../../domain/contracts/reading-report.interface.repository';

@Injectable()
export class GetDashboardMetricsUseCase {
  constructor(
    @Inject('ReadingReportRepository')
    private readonly reportRepository: InterfaceReadingReportRepository,
  ) {}

  async execute(date: string): Promise<DashboardMetrics> {
    return this.reportRepository.findDashboardMetrics(date);
  }
}
