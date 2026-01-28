import { LocationResponse } from "../../../../domain/schemas/dto/response/location.response";
import { LocationSqlResult } from "../../../interfaces/sql/location.sql.result";

export class LocationAdapter {
  static fromLocationSqlResultToLocationResponse(locationSqlResult: LocationSqlResult): LocationResponse {
    return {
      locationId: locationSqlResult.locationId,
      coordinates: locationSqlResult.coordinates,
      metadata: JSON.parse(locationSqlResult.metadata),
      connectionId: locationSqlResult.connectionId,
      createdAt: locationSqlResult.createdAt,
    };
  }
}