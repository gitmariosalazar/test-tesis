import { Module } from '@nestjs/common';
import { KafkaServiceModule } from '../../../../../shared/kafka/kafka-service.module';
import { CategoryController } from '../../controllers/category.controller';
import { DatabaseServicePostgreSQL } from '../../../../../shared/connections/database/postgresql/postgresql.service';
import { CategoryService } from '../../../application/services/category.service';
import { CategoryPostgreSQLPersistence } from '../../repositories/postgresql/persistence/postgresql.category.persistence';

@Module({
  imports: [KafkaServiceModule],
  controllers: [CategoryController],
  providers: [
    DatabaseServicePostgreSQL,
    CategoryService,
    {
      provide: 'CategoryRepository',
      useClass: CategoryPostgreSQLPersistence,
    },
  ],
})
export class PostgresqlCategoryModule {}
