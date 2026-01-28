import { Module } from "@nestjs/common";
import { ObservationReadingController } from "../../controllers/observation-reading.controller";
import { ObservationReadingPostgreSQLPersistence } from "../../repositories/postgresql/persistence/postgresql.observation-reading.persistence";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { environments } from "../../../../../settings/environments/environments";
import { ObservationReadingService } from "../../../application/services/observation-reading.service";
import { DatabaseServicePostgreSQL } from "../../../../../shared/connections/database/postgresql/postgresql.service";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: environments.OBSERVATION_KAFKA_CLIENT,
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: [environments.KAFKA_BROKER_URL],
            clientId: environments.OBSERVATION_KAFKA_CLIENT_ID
          },
          consumer: {
            groupId: environments.OBSERVATION_KAFKA_GROUP_ID
          }
        }
      }
    ]),
  ],
  controllers: [
    ObservationReadingController
  ],
  providers: [
    DatabaseServicePostgreSQL,
    ObservationReadingService,
    {
      provide: 'ObservationReadingRepository',
      useClass: ObservationReadingPostgreSQLPersistence
    }
  ],
  exports: []
})
export class ObservationReadingPostgreSQLModule { }