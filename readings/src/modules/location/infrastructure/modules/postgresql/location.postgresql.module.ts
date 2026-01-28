import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { LocationController } from "../../controllers/location.controller";
import { LocationPersistencePostgresql } from "../../repositories/postgresql/persistence/postgresql.location.persistence";
import { environments } from "../../../../../settings/environments/environments";
import { DatabaseServicePostgreSQL } from "../../../../../shared/connections/database/postgresql/postgresql.service";
import { LocationService } from "../../../application/services/location.service";

@Module({
  imports: [
    ClientsModule.register([
      {

        name: environments.LOCATION_CONNECTION_KAFKA_CLIENT,
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: environments.LOCATION_CONNECTION_KAFKA_CLIENT_ID,
            brokers: [environments.KAFKA_BROKER_URL]
          },
          consumer: {
            groupId: environments.LOCATION_CONNECTION_KAFKA_GROUP_ID
          }
        }
      }
    ]),
  ],
  controllers: [LocationController],
  providers: [
    DatabaseServicePostgreSQL,
    LocationService,
    {
      provide: 'LocationRepository',
      useClass: LocationPersistencePostgresql
    }
  ],
  exports: []
})
export class LocationModuleUsingPostgreSQL { }