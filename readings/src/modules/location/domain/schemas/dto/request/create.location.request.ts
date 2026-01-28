export class CreateLocationRequest {
  latitude: number;
  longitude: number;
  metadata?: { [key: string]: any };
  connectionId: string;

  constructor(latitude: number, longitude: number, connectionId: string, metadata?: { [key: string]: any }) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.connectionId = connectionId;
    this.metadata = metadata;
  }
}
