import { Module } from '@nestjs/common';
import { KafkaServiceModule } from '../../../../../shared/kafka/kafka-service.module';
import { RolController } from '../../controllers/rol.controller';
import { DatabaseServicePostgreSQL } from '../../../../../shared/connections/database/postgresql/postgresql.service';
import { RolService } from '../../../application/services/rol.service';
import { RolPostgreSQLPersistence } from '../../repositories/postgresql/persistence/postgresql.rol.persistence';

@Module({
  imports: [KafkaServiceModule],
  controllers: [
    // Add RolController here when implemented
    RolController,
  ],
  providers: [
    // Add RolService and RolPostgreSQLPersistence here when implemented
    DatabaseServicePostgreSQL,
    RolService,
    {
      provide: 'RolRepository',
      useClass: RolPostgreSQLPersistence,
    },
  ],
  exports: [],
})
export class PostgreSQLRolModule {}
