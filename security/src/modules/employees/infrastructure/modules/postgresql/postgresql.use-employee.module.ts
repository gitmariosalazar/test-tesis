import { Module } from '@nestjs/common';
import { KafkaServiceModule } from '../../../../../shared/kafka/kafka-service.module';
import { UserEmployeeController } from '../../controller/user-employee.controller';
import { DatabaseServicePostgreSQL } from '../../../../../shared/connections/database/postgresql/postgresql.service';
import { PostgreSQLUserEmployeePersistence } from '../../repositories/postgresql/persistence/postgresql.user-employee.persistence';
import { CreateEmployeeUseCase } from '../../../application/usecases/create-employee.usecase';
import { FindEmployeeUseCase } from '../../../application/usecases/find-employee.usecase';
import { UpdateEmployeeUseCase } from '../../../application/usecases/update-employee.usecase';
import { ManageEmployeeUseCase } from '../../../application/usecases/manage-employee.usecase';

@Module({
  imports: [KafkaServiceModule],
  controllers: [UserEmployeeController],
  providers: [
    DatabaseServicePostgreSQL,
    CreateEmployeeUseCase,
    FindEmployeeUseCase,
    UpdateEmployeeUseCase,
    ManageEmployeeUseCase,
    {
      provide: 'UserEmployeeRepository',
      useClass: PostgreSQLUserEmployeePersistence,
    },
  ],
  exports: [],
})
export class PostgresqlUserEmployeeModule {}
