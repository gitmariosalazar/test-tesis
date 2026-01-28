import { Module } from '@nestjs/common';
import { KafkaServiceModule } from '../../../../../shared/kafka/kafka-service.module';
import { PermissionController } from '../../controllers/permission.controller';
import { DatabaseServicePostgreSQL } from '../../../../../shared/connections/database/postgresql/postgresql.service';
import { PermissionService } from '../../../application/services/permission.service';
import { PermissionPostgreSQLPersistence } from '../../repositories/persistence/postgresql.permission.persistence';

@Module({
  imports: [KafkaServiceModule],
  controllers: [PermissionController],
  providers: [
    DatabaseServicePostgreSQL,
    PermissionService,
    {
      provide: 'PermissionRepository',
      useClass: PermissionPostgreSQLPersistence,
    },
  ],
  exports: [],
})
export class PostgreSQLPermissionModule {}
