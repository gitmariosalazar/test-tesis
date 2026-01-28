export interface LocationSqlResult {
  locationId: number;
  coordinates: string; // POINT(lon lat) format
  metadata: string; // JSON string
  connectionId: string;
  createdAt?: Date;
}