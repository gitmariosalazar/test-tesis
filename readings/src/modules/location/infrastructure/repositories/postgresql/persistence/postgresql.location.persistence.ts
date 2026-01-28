import { Injectable } from "@nestjs/common";
import { LocationSqlResult } from "../../../interfaces/sql/location.sql.result";
import { LocationAdapter } from "../adapters/location.postgresql.adapter";
import { InterfaceLocationRepository } from "../../../../domain/contracts/location.interface.repository";
import { DatabaseServicePostgreSQL } from "../../../../../../shared/connections/database/postgresql/postgresql.service";
import { LocationResponse } from "../../../../domain/schemas/dto/response/location.response";
import { LocationModel } from "../../../../domain/schemas/model/location.model";

@Injectable()
export class LocationPersistencePostgresql implements InterfaceLocationRepository {
  constructor(
    private readonly postgresqlService: DatabaseServicePostgreSQL
  ) { }

  async verifyLocationByConnectionIdExists(connectionId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM Ubicacion
        WHERE acometidaId = $1
      ) AS "exists";
    `;

    const result = await this.postgresqlService.query<{ exists: boolean }>(query, [connectionId]);
    return result[0]?.exists || false;
  }

  async getLocationById(locationId: number): Promise<LocationResponse | null> {
    try {
      const query = `
      SELECT
        u.ubicacionId AS "locationId",
        u.acometidaId AS "connectionId",
        ST_AsText(u.coordenadas) AS "coordinates",
        CAST(u.metadata AS TEXT) AS "metadata",
        u.fechaRegistro AS "createdAt"
        FROM Ubicacion u
      WHERE u.ubicacionId = $1;
    `;

      const result = await this.postgresqlService.query<LocationSqlResult>(query, [locationId]);

      const locationResponse = LocationAdapter.fromLocationSqlResultToLocationResponse(result[0]);

      return locationResponse || null;
    } catch (error) {
      throw error;
    }
  }

  async getLocationsByConnectionId(connectionId: string): Promise<LocationResponse[]> {
    try {
      const query = `
        SELECT
          u.ubicacionId AS "locationId",
          u.acometidaId AS "connectionId",
          ST_AsText(u.coordenadas) AS "coordinates",
          CAST(u.metadata AS TEXT) AS "metadata",
          u.fechaRegistro AS "createdAt"
        FROM Ubicacion u
      `;
      const whereClause = `WHERE u.acometidaId = $1;`;

      const result = await this.postgresqlService.query<LocationSqlResult>(query + whereClause, [connectionId]);

      return result.map(LocationAdapter.fromLocationSqlResultToLocationResponse);
    } catch (error) {
      throw error;
    }
  }

  async createLocation(location: LocationModel): Promise<LocationResponse | null> {
    try {
      const query = `
        INSERT INTO Ubicacion (coordenadas, metadata, acometidaId)
          VALUES (ST_GeomFromText($1, 4326), $2::jsonb, $3)
          RETURNING
        ubicacionId AS "locationId",
        acometidaId AS "connectionId",
        ST_AsText(coordenadas) AS "coordinates",
        metadata::text AS "metadata",
        fechaRegistro AS "createdAt";
      `;

      const values = [
        location.getCoordinates(),
        location.getMetadata(),
        location.getConnectionId(),
      ];

      const result = await this.postgresqlService.query<LocationSqlResult>(query, values);
      const locationResponse = LocationAdapter.fromLocationSqlResultToLocationResponse(result[0]);

      return locationResponse || null;
    } catch (error) {
      throw error;
    }
  }
}