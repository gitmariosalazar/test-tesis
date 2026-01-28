import { LocationResponse } from '../schemas/dto/response/location.response';
import { LocationModel } from '../schemas/model/location.model';

export interface InterfaceLocationRepository {
  createLocation(location: LocationModel): Promise<LocationResponse | null>;

  getLocationById(locationId: number): Promise<LocationResponse | null>;

  getLocationsByConnectionId(connectionId: string): Promise<LocationResponse[]>;
  verifyLocationByConnectionIdExists(connectionId: string): Promise<boolean>;
}
