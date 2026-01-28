import { Inject, Injectable } from "@nestjs/common";
import { InterfaceLocationUseCase } from "../usecases/location.use-case.interface";
import { InterfaceLocationRepository } from "../../domain/contracts/location.interface.repository";
import { CreateLocationRequest } from "../../domain/schemas/dto/request/create.location.request";
import { LocationResponse } from "../../domain/schemas/dto/response/location.response";
import { RpcException } from "@nestjs/microservices";
import { LocationModel } from "../../domain/schemas/model/location.model";
import { LocationMapper } from "../mappers/location.mapper";
import { validateFields } from "../../../../shared/validators/fields.validators";
import { statusCode } from "../../../../settings/environments/status-code";

@Injectable()
export class LocationService implements InterfaceLocationUseCase {
  constructor(
    @Inject('LocationRepository')
    private readonly locationRepository: InterfaceLocationRepository
  ) { }

  async createLocation(location: CreateLocationRequest): Promise<LocationResponse | null> {
    try {

      const requiredFields: string[] = ['latitude', 'longitude', 'connectionId', 'metadata'];

      const missingFieldsMessages: string[] = validateFields(location, requiredFields);

      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldsMessages
        });
      }

      const locationModel: LocationModel = LocationMapper.fromCreateLocationRequestToLocationModel(location);

      const existLocation: boolean = await this.locationRepository.verifyLocationByConnectionIdExists(location.connectionId);

      if (existLocation) {
        throw new RpcException({
          statusCode: statusCode.CONFLICT,
          message: 'Location for the given connection ID already exists',
        });
      }

      const createdLocation = await this.locationRepository.createLocation(locationModel);

      if (!createdLocation) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to create location',
        });
      }

      return createdLocation;
    } catch (error) {
      throw error;
    }
  }

  async verifyLocationByConnectionIdExists(connectionId: string): Promise<boolean> {
    return this.locationRepository.verifyLocationByConnectionIdExists(connectionId);
  }

  async getLocationsByConnectionId(connectionId: string): Promise<LocationResponse[]> {
    try {

      if (!connectionId || connectionId.trim() === '') {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Connection ID is required',
        })
      }

      const verifyIfExists: boolean = await this.locationRepository.verifyLocationByConnectionIdExists(connectionId);

      if (!verifyIfExists) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `No locations found for connection ID: ${connectionId}`,
        });
      }

      return await this.locationRepository.getLocationsByConnectionId(connectionId);
    } catch (error) {
      throw error;
    }
  }

  async getLocationById(locationId: number): Promise<LocationResponse | null> {
    try {

      if (!locationId) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Location ID is required',
        })
      }

      return await this.locationRepository.getLocationById(locationId);
    } catch (error) {
      throw error;
    }
  }
}