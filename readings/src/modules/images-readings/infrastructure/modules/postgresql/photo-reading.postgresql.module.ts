import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { PhotoReadingController } from "../../controllers/photo-reading.controller";
import { PhotoReadingPostgreSQLPersistence } from "../../repositories/postgresql/persistence/postgresql.photo-reading.persistence";
import { environments } from "../../../../../settings/environments/environments";
import { DatabaseServicePostgreSQL } from "../../../../../shared/connections/database/postgresql/postgresql.service";
import { PhotoReadingService } from "../../../application/services/photo-reading.service";

@Module({
  imports: [
    ClientsModule.register([
      {
        name: environments.PHOTO_READING_KAFKA_CLIENT,
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: [environments.KAFKA_BROKER_URL],
            clientId: environments.PHOTO_READING_KAFKA_CLIENT_ID
          },
          consumer: {
            groupId: environments.PHOTO_READING_KAFKA_GROUP_ID
          }
        }
      }
    ]),
  ],
  controllers: [
    PhotoReadingController
  ],
  providers: [
    DatabaseServicePostgreSQL,
    PhotoReadingService,
    {
      provide: 'PhotoReadingRepository',
      useClass: PhotoReadingPostgreSQLPersistence
    }
  ],
  exports: []
})
export class PhotoReadingPostgreSQLModule { }