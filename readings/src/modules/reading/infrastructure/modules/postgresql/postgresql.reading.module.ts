import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ReadingController } from '../../controllers/readings.controller';
import { ReadingPersistencePostgreSQL } from '../../repositories/postgresql/persistence/reading-postgresql.persistence';
import { environments } from '../../../../../settings/environments/environments';
import { DatabaseServicePostgreSQL } from '../../../../../shared/connections/database/postgresql/postgresql.service';
import { ReadingUseCaseService } from '../../../application/services/reading.service';
import { ObservationReadingPostgreSQLPersistence } from '../../../../observations/infrastructure/repositories/postgresql/persistence/postgresql.observation-reading.persistence';

import { CreateReadingUseCase } from '../../../application/usecases/CreateReadingUseCase';
import { UpdateReadingUseCase } from '../../../application/usecases/UpdateReadingUseCase';
import { FindReadingUseCase } from '../../../application/usecases/FindReadingUseCase';
import { FindBasicReadingUseCase } from '../../../application/usecases/FindBasicReadingUseCase';

import { ReadingReportController } from '../../controllers/reading-report.controller';
import { ReadingReportPostgreSQLPersistence } from '../../repositories/postgresql/persistence/reading-report-postgresql.persistence';
import { GetConnectionLastReadingsReportUseCase } from '../../../application/usecases/reports/GetConnectionLastReadingsReportUseCase';
import { GetDailyReadingsReportUseCase } from '../../../application/usecases/reports/GetDailyReadingsReportUseCase';
import { GetYearlyReadingsReportUseCase } from '../../../application/usecases/reports/GetYearlyReadingsReportUseCase';
import { GetDashboardMetricsUseCase } from '../../../application/usecases/dashboard/GetDashboardMetricsUseCase';
import { GetGlobalStatsReportUseCase } from '../../../application/usecases/reports/GetGlobalStatsReportUseCase';
import { GetDailyStatsReportUseCase } from '../../../application/usecases/reports/GetDailyStatsReportUseCase';
import { GetSectorStatsReportUseCase } from '../../../application/usecases/reports/GetSectorStatsReportUseCase';
import { GetNoveltyStatsReportUseCase } from '../../../application/usecases/reports/GetNoveltyStatsReportUseCase';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: environments.READINGS_KAFKA_CLIENT,
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: environments.READINGS_KAFKA_CLIENT_ID,
            brokers: [environments.KAFKA_BROKER_URL],
          },
          consumer: {
            groupId: environments.READINGS_KAFKA_GROUP_ID,
          },
        },
      },
    ]),
  ],
  controllers: [ReadingController, ReadingReportController],
  providers: [
    DatabaseServicePostgreSQL,
    ReadingUseCaseService,
    CreateReadingUseCase,
    UpdateReadingUseCase,
    FindReadingUseCase,
    FindBasicReadingUseCase,
    GetConnectionLastReadingsReportUseCase,
    GetDailyReadingsReportUseCase,
    GetYearlyReadingsReportUseCase,
    GetDashboardMetricsUseCase,
    GetGlobalStatsReportUseCase,
    GetDailyStatsReportUseCase,
    GetSectorStatsReportUseCase,
    GetNoveltyStatsReportUseCase,
    {
      provide: 'ReadingRepository',
      useClass: ReadingPersistencePostgreSQL,
    },
    {
      provide: 'ObservationReadingRepository',
      useClass: ObservationReadingPostgreSQLPersistence,
    },
    {
      provide: 'ReadingReportRepository',
      useClass: ReadingReportPostgreSQLPersistence,
    },
  ],
  exports: [],
})
export class ReadingModuleUsingPostgreSQL {}
