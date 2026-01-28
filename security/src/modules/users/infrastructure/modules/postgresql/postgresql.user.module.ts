import { Module } from '@nestjs/common';
import { KafkaServiceModule } from '../../../../../shared/kafka/kafka-service.module';
import { UserController } from '../../controllers/user.controller';
import { DatabaseServicePostgreSQL } from '../../../../../shared/connections/database/postgresql/postgresql.service';
import { PostgreSQLUserPersistence } from '../../repositories/postgresql/persistence/postgresql.user.persistence';
import { CreateUserUseCase } from '../../../application/usecases/create-user.usecase';
import { FindUserUseCase } from '../../../application/usecases/find-user.usecase';
import { AuthUserUseCase } from '../../../application/usecases/auth.usecase';
import { UpdateUserUseCase } from '../../../application/usecases/update-user.usecase';
import { BcryptEncryptionService } from '../../adapters/bcrypt.encryption.service';

@Module({
  imports: [KafkaServiceModule],
  controllers: [UserController],
  providers: [
    DatabaseServicePostgreSQL,
    CreateUserUseCase,
    FindUserUseCase,
    AuthUserUseCase,
    UpdateUserUseCase,
    BcryptEncryptionService,
    {
      provide: 'EncryptionService',
      useClass: BcryptEncryptionService,
    },
    {
      provide: 'UserRepository',
      useClass: PostgreSQLUserPersistence,
    },
  ],
  exports: [],
})
export class PostgresqlUserModule {}
