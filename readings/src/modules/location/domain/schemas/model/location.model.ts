export class LocationModel {
  private locationId?: number;
  private coordinates: string; // POINT(lon lat) format
  private metadata: { [key: string]: any };
  private connectionId: string;
  private createdAt?: Date;

  constructor(
    coordinates: string,
    metadata: Record<string, any>,
    connectionId: string,
    locationId?: number,
    createdAt?: Date,
  ) {
    this.locationId = locationId;
    this.coordinates = coordinates;
    this.metadata = metadata;
    this.connectionId = connectionId;
    this.createdAt = createdAt;
  }

  getLocationId(): number | undefined {
    return this.locationId;
  }

  getCoordinates(): string {
    return this.coordinates;
  }

  getMetadata(): { [key: string]: any } {
    return this.metadata;
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  getCreatedAt(): Date | undefined {
    return this.createdAt;
  }

  setCoordinates(coordinates: string): void {
    this.coordinates = coordinates;
  }

  setMetadata(metadata: { [key: string]: any }): void {
    this.metadata = metadata;
  }

  setConnectionId(connectionId: string): void {
    this.connectionId = connectionId;
  }

  setCreatedAt(createdAt: Date): void {
    this.createdAt = createdAt;
  }
}