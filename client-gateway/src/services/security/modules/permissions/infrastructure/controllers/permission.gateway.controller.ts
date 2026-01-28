import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  OnModuleInit,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { environments } from '../../../../../../settings/environments/environments';
import { CreatePermissionRequest } from '../../domain/schemas/dto/request/create.permission.request';
import { ApiResponse } from '../../../../../../shared/errors/responses/ApiResponse';
import { sendKafkaRequest } from '../../../../../../shared/utils/kafka/send.kafka.request';
import { AuthGuard } from '../../../../../../auth/guard/auth.guard';
import { PermissionResponse } from '../../domain/schemas/dto/response/permission.response';

@Controller('permissions')
@ApiTags('Permissions Gateway')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PermissionGatewayController implements OnModuleInit {
  constructor(
    @Inject(environments.GATEWAY_PERMISSIONS_KAFKA_CLIENT)
    private readonly clientKafka: ClientKafka,
  ) {}

  async onModuleInit() {
    const requestPatterns = [
      'authentication.permission.verify-permission-exists-by-name',
      'authentication.permission.get-permission-by-id',
      'authentication.permission.get-all-permissions',
      'authentication.permission.create-permission',
      'authentication.permission.update-permission',
      'authentication.permission.delete-permission',
    ];

    requestPatterns.forEach((pattern) => {
      this.clientKafka.subscribeToResponseOf(pattern);
    });

    await this.clientKafka.connect();
  }

  @Post('create-permission')
  @ApiOperation({
    summary: 'Create a new permission',
    description:
      'Creates a new permission by sending a request to the authentication service via Kafka.',
  })
  async createPermissionGateway(
    @Req() request: Request,
    @Body() permission: CreatePermissionRequest,
  ): Promise<ApiResponse> {
    try {
      const response: PermissionResponse = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.permission.create-permission',
          permission,
        ),
      );
      return new ApiResponse(
        'Permission created successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Put('update-permission/:permissionId')
  @ApiOperation({
    summary: 'Update an existing permission',
    description:
      'Updates an existing permission by sending a request to the authentication service via Kafka.',
  })
  async updatePermissionGateway(
    @Req() request: Request,
    @Param('permissionId', ParseIntPipe) permissionId: number,
    @Body() permission: CreatePermissionRequest,
  ): Promise<ApiResponse> {
    try {
      const response: PermissionResponse = await sendKafkaRequest(
        this.clientKafka.send('authentication.permission.update-permission', {
          permissionId,
          permission,
        }),
      );
      return new ApiResponse(
        'Permission updated successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Delete('delete-permission/:permissionId')
  @ApiOperation({
    summary: 'Delete a permission',
    description:
      'Deletes a permission by sending a request to the authentication service via Kafka.',
  })
  async deletePermissionGateway(
    @Req() request: Request,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ): Promise<ApiResponse> {
    try {
      const response: boolean = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.permission.delete-permission',
          permissionId,
        ),
      );
      return new ApiResponse(
        'Permission deleted successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('get-permission/:permissionId')
  @ApiOperation({
    summary: 'Get permission by ID',
    description:
      'Retrieves a permission by ID by sending a request to the authentication service via Kafka.',
  })
  async getPermissionByIdGateway(
    @Req() request: Request,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ): Promise<ApiResponse> {
    try {
      const response: PermissionResponse = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.permission.get-permission-by-id',
          permissionId,
        ),
      );
      return new ApiResponse(
        'Permission retrieved successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('get-all-permissions')
  @ApiOperation({
    summary: 'Get all permissions',
    description:
      'Retrieves all permissions by sending a request to the authentication service via Kafka.',
  })
  async getAllPermissionsGateway(
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: PermissionResponse[] = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.permission.get-all-permissions',
          {},
        ),
      );
      return new ApiResponse(
        'Permissions retrieved successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('verify-permission-exists/:permissionName')
  @ApiOperation({
    summary: 'Verify if permission exists by name',
    description:
      'Verifies if a permission exists by name by sending a request to the authentication service via Kafka.',
  })
  async verifyPermissionExistsByNameGateway(
    @Req() request: Request,
    @Param('permissionName') permissionName: string,
  ): Promise<ApiResponse> {
    try {
      const response: boolean = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.permission.verify-permission-exists-by-name',
          permissionName,
        ),
      );
      return new ApiResponse(
        'Permission existence verified successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }
}
