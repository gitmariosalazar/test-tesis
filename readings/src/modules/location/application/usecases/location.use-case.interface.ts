import { CreateLocationRequest } from "../../domain/schemas/dto/request/create.location.request";
import { LocationResponse } from "../../domain/schemas/dto/response/location.response";

export interface InterfaceLocationUseCase {
  createLocation(location: CreateLocationRequest): Promise<LocationResponse | null>;
  getLocationById(locationId: number): Promise<LocationResponse | null>;
  getLocationsByConnectionId(connectionId: string): Promise<LocationResponse[]>;
  verifyLocationByConnectionIdExists(connectionId: string): Promise<boolean>;
}