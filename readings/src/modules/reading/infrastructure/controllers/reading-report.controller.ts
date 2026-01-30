import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GetConnectionLastReadingsReportUseCase } from '../../application/usecases/reports/GetConnectionLastReadingsReportUseCase';
import { GetDailyReadingsReportUseCase } from '../../application/usecases/reports/GetDailyReadingsReportUseCase';
import { GetYearlyReadingsReportUseCase } from '../../application/usecases/reports/GetYearlyReadingsReportUseCase';
import { GetDashboardMetricsUseCase } from '../../application/usecases/dashboard/GetDashboardMetricsUseCase';
import { GetGlobalStatsReportUseCase } from '../../application/usecases/reports/GetGlobalStatsReportUseCase';
import { GetDailyStatsReportUseCase } from '../../application/usecases/reports/GetDailyStatsReportUseCase';
import { GetSectorStatsReportUseCase } from '../../application/usecases/reports/GetSectorStatsReportUseCase';
import { GetNoveltyStatsReportUseCase } from '../../application/usecases/reports/GetNoveltyStatsReportUseCase';
import {
  ConnectionLastReadingsReport,
  DailyReadingsReport,
  YearlyReadingsReport,
  DashboardMetrics,
  GlobalStatsReport,
  DailyStatsReport,
  SectorStatsReport,
  NoveltyStatsReport,
  AdvancedReportReadingsResponse,
} from '../../domain/contracts/reading-report.interface.repository';
import { GetAdvancedReportReadingsUseCase } from '../../application/usecases/reports/GetAdvancedReportReadingsUseCase';

@Controller()
export class ReadingReportController {
  constructor(
    private readonly getConnectionLastReadingsUseCase: GetConnectionLastReadingsReportUseCase,
    private readonly getDailyReadingsUseCase: GetDailyReadingsReportUseCase,
    private readonly getYearlyReadingsUseCase: GetYearlyReadingsReportUseCase,
    private readonly getDashboardMetricsUseCase: GetDashboardMetricsUseCase,
    private readonly getGlobalStatsUseCase: GetGlobalStatsReportUseCase,
    private readonly getDailyStatsUseCase: GetDailyStatsReportUseCase,
    private readonly getSectorStatsUseCase: GetSectorStatsReportUseCase,
    private readonly getNoveltyStatsUseCase: GetNoveltyStatsReportUseCase,
    private readonly getAdvancedReportReadingsUseCase: GetAdvancedReportReadingsUseCase,
  ) {}

  @MessagePattern('reading.report.connection.last-10')
  async getLastReadingsForConnection(
    @Payload() payload: { cadastralKey: string; limit: number },
  ): Promise<ConnectionLastReadingsReport[]> {
    const { cadastralKey, limit } = payload;
    return this.getConnectionLastReadingsUseCase.execute(cadastralKey, limit);
  }

  @MessagePattern('reading.report.daily')
  async getDailyReport(
    @Payload() date: string,
  ): Promise<DailyReadingsReport[]> {
    console.log(`date payload`, date);
    return this.getDailyReadingsUseCase.execute(date);
  }

  @MessagePattern('reading.report.yearly')
  async getYearlyReport(
    @Payload() year: number,
  ): Promise<YearlyReadingsReport> {
    return this.getYearlyReadingsUseCase.execute(year);
  }

  @MessagePattern('reading.dashboard.metrics')
  async getDashboardMetrics(
    @Payload() date: string,
  ): Promise<DashboardMetrics> {
    return this.getDashboardMetricsUseCase.execute(date);
  }

  @MessagePattern('reading.report.stats.global')
  async getGlobalStats(@Payload() month: string): Promise<GlobalStatsReport> {
    return this.getGlobalStatsUseCase.execute(month);
  }

  @MessagePattern('reading.report.stats.daily')
  async getDailyStats(@Payload() month: string): Promise<DailyStatsReport[]> {
    return this.getDailyStatsUseCase.execute(month);
  }

  @MessagePattern('reading.report.stats.sector')
  async getSectorStats(@Payload() month: string): Promise<SectorStatsReport[]> {
    return this.getSectorStatsUseCase.execute(month);
  }

  @MessagePattern('reading.report.stats.novelty')
  async getNoveltyStats(
    @Payload() month: string,
  ): Promise<NoveltyStatsReport[]> {
    return this.getNoveltyStatsUseCase.execute(month);
  }

  @MessagePattern('reading.report.advanced-monthly')
  async getAdvancedReportReadings(
    @Payload() month: string,
  ): Promise<AdvancedReportReadingsResponse[]> {
    return this.getAdvancedReportReadingsUseCase.execute(month);
  }
}
