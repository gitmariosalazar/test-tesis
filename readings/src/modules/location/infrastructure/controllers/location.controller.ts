import { Controller, Get, Post } from "@nestjs/common";
import { LocationService } from "../../application/services/location.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CreateLocationRequest } from "../../domain/schemas/dto/request/create.location.request";

@Controller('location')
export class LocationController {
  constructor(
    private readonly locationService: LocationService
  ) { }

  @Get('get-locations/:connectionId')
  @MessagePattern('location.get-locations-by-connection-id')
  async getLocations(@Payload() connectionId: string) {
    return this.locationService.getLocationsByConnectionId(connectionId);
  }

  @Get('verify-location/:connectionId')
  @MessagePattern('location.verify-location-by-connection-id')
  async verifyLocation(@Payload() connectionId: string) {
    return this.locationService.verifyLocationByConnectionIdExists(connectionId);
  }

  @Post('create-location')
  @MessagePattern('location.create-location')
  async createLocation(@Payload() location: CreateLocationRequest) {
    return this.locationService.createLocation(location);
  }

  @Get('get-location/:locationId')
  @MessagePattern('location.get-location-by-id')
  async getLocationById(@Payload() locationId: number) {
    return this.locationService.getLocationById(locationId);
  }
}