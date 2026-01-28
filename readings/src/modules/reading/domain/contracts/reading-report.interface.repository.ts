export interface ConnectionLastReadingsReport {
  readingId: number;
  readingDate: Date;
  readingValue: number;
  consumption: number;
  clientName: string;
  cadastralKey: string;
  meterNumber: string;
  address: string;
  novelty: string;
  readerName?: string; // If available
  previewReading?: number;
  currentReading?: number;
  clientId?: number;
}

export interface DailyReadingsReport {
  readingId: number;
  readingTime: string;
  cadastralKey: string;
  clientName: string;
  readingValue: number;
  consumption: number;
  novelty: string;
  readerName?: string; // If available
  previewReading?: number;
  currentReading?: number;
  clientId?: number;
}

export interface MonthlySummary {
  month: string;
  totalReadings: number;
  totalConsumption: number;
}

export interface YearlyReadingsReport {
  year: number;
  totalReadings: number;
  averageConsumption: number;
  monthlySummaries: MonthlySummary[];
}

export interface DashboardMetrics {
  totalReadingsToday: number;
  pendingReadingsToday: number; // If applicable
  readingsWithNoveltyToday: number;
  efficiencyPercentage: number;
  noveltyDistribution: { novelty: string; count: number }[];
}

export interface GlobalStatsReport {
  totalReadings: number;
  readingsWithData: number; // days_with_readings
  averageReadingsPerDay: number;
  averageReadingValue: number;
  totalReadingValue: number;
  minReadingValue: number;
  maxReadingValue: number;
  averageSewerRate: number;
  totalSewerRate: number;
  averageConsumption: number;
  totalConsumption: number;
  uniqueSectors: number;
  uniqueConnections: number;
  uniqueCadastralKeys: number;
  countNonNullReadingValue: number;
  countNonNullSewerRate: number;
}

export interface DailyStatsReport {
  date: string;
  readingsCount: number;
  totalReadingValue: number;
  averageReadingValue: number;
  minReadingValue: number;
  maxReadingValue: number;
  averageSewerRate: number;
  averageConsumption: number;
  uniqueSectors: number;
  uniqueConnections: number;
}

export interface SectorStatsReport {
  sector: number;
  readingsCount: number;
  totalReadingValue: number;
  averageReadingValue: number;
  averageSewerRate: number;
  averageConsumption: number;
  activeDays: number;
}

export interface NoveltyStatsReport {
  novelty: string;
  count: number;
  averageReadingValue: number;
  averageConsumption: number;
  totalReadingValue: number;
}

export interface InterfaceReadingReportRepository {
  findLastReadingsByConnection(
    cadastralKey: string,
    limit: number,
  ): Promise<ConnectionLastReadingsReport[]>;
  findReadingsByDate(date: string): Promise<DailyReadingsReport[]>;
  findYearlyReport(year: number): Promise<YearlyReadingsReport>; // Or return raw data to aggregate in Use Case
  findDashboardMetrics(date: string): Promise<DashboardMetrics>;
  findGlobalStats(month: string): Promise<GlobalStatsReport>;
  findDailyStats(month: string): Promise<DailyStatsReport[]>;
  findSectorStats(month: string): Promise<SectorStatsReport[]>;
  findNoveltyStats(month: string): Promise<NoveltyStatsReport[]>;
}
