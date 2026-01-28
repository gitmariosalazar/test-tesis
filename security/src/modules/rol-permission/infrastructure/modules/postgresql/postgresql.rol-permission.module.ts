import { Module } from '@nestjs/common';
import { KafkaServiceModule } from '../../../../../shared/kafka/kafka-service.module';
import { RolPermissionController } from '../../controllers/rol-permission.controller';
import { DatabaseServicePostgreSQL } from '../../../../../shared/connections/database/postgresql/postgresql.service';
import { RolPermissionService } from '../../../application/services/rol-permission.service';
import { RolPermissionPostgreSQLPersistence } from '../../repositories/postgresql/persistence/postgresql.rol-permission.persistence';

@Module({
  imports: [KafkaServiceModule],
  controllers: [RolPermissionController],
  providers: [
    DatabaseServicePostgreSQL,
    RolPermissionService,
    {
      provide: 'RolPermissionRepository',
      useClass: RolPermissionPostgreSQLPersistence,
    },
  ],
})
export class PostgresqlRolPermissionModule {}
