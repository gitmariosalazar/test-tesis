import { ClientKafka } from '@nestjs/microservices/client/client-kafka';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { environments } from '../../../../../../settings/environments/environments';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Logger,
  OnModuleInit,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse } from '../../../../../../shared/errors/responses/ApiResponse';
import { sendKafkaRequest } from '../../../../../../shared/utils/kafka/send.kafka.request';
import { CreateUserRequest } from '../../domain/schemas/dto/request/create.user.request';
import { RpcException } from '@nestjs/microservices';
import { ChangePasswordUserRequest } from '../../domain/schemas/dto/request/change-password.user.request';
import { UpdateUserRequest } from '../../domain/schemas/dto/request/update.user.request';
import { AuthGuard } from '../../../../../../auth/guard/auth.guard';
import {
  UserResponse,
  UserResponseWithRolesAndPermissionsResponse,
} from '../../domain/schemas/dto/response/user.response';

@Controller('users-gateway')
@ApiTags('Users-Gateway')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class UserGatewayController implements OnModuleInit {
  constructor(
    @Inject(environments.GATEWAY_USERS_KAFKA_CLIENT)
    private readonly clientKafka: ClientKafka,
  ) {}

  onModuleInit() {
    const requestPatterns = [
      'authentication.user.find_by_id',
      'authentication.user.find_by_username_or_email',
      'authentication.user.create_user',
      'authentication.user.increment_failed_attempts',
      'authentication.user.reset_failed_attempts',
      'authentication.user.soft_delete',
      'authentication.user.restore',
      'authentication.user.update_user',
      'authentication.user.update_password',
      'authentication.user.verify_credentials',
      'authentication.user.find_by_refresh_token',
      'authentication.user.exists_by_username_or_email',
      'authentication.user.exists_by_username',
      'authentication.user.exists_by_email',
      'authentication.user.find_by_username',
      'authentication.user.find_by_email',
      'authentication.user.find_all',
      'authentication.user.get_profile',
    ];

    requestPatterns.forEach((pattern) => {
      this.clientKafka.subscribeToResponseOf(pattern);
    });

    return this.clientKafka.connect();
  }

  @Post('create-user')
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user in the authentication service.',
  })
  async createUser(
    @Body() userData: CreateUserRequest,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponse = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.create_user', userData),
      );

      return new ApiResponse(
        'User created successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('find-by-username-or-email')
  @ApiOperation({
    summary: 'Find user by username or email',
    description:
      'Retrieves a user from the authentication service by username or email.',
  })
  async findByUsernameOrEmail(
    @Query('username') username: string,
    @Query('email') email: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponseWithRolesAndPermissionsResponse =
        await sendKafkaRequest(
          this.clientKafka.send(
            'authentication.user.find_by_username_or_email',
            {
              username,
              email,
            },
          ),
        );

      return new ApiResponse(
        'User retrieved successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Put('update-user/:userId')
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates an existing user in the authentication service.',
  })
  async updateUser(
    @Param('userId') userId: string,
    @Body() updates: UpdateUserRequest,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponse = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.update_user', {
          userId,
          updates,
        }),
      );

      return new ApiResponse(
        'User updated successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('find-by-id/:userId')
  @ApiOperation({
    summary: 'Find user by ID',
    description: 'Retrieves a user from the authentication service by ID.',
  })
  async findById(
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponse = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.find_by_id', userId),
      );

      return new ApiResponse(
        'User retrieved successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('exists-by-username-or-email')
  @ApiOperation({
    summary: 'Check if user exists by username or email',
    description:
      'Checks if a user exists in the authentication service by username or email.',
  })
  async existsByUsernameOrEmail(
    @Query('username') username: string,
    @Query('email') email: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: boolean = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.user.exists_by_username_or_email',
          { username, email },
        ),
      );

      return new ApiResponse(
        'User existence checked successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('exists-by-username/:username')
  @ApiOperation({
    summary: 'Check if user exists by username',
    description:
      'Checks if a user exists in the authentication service by username.',
  })
  async existsByUsername(
    @Param('username') username: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: boolean = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.user.exists_by_username',
          username,
        ),
      );

      return new ApiResponse(
        'User existence checked successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('exists-by-email/:email')
  @ApiOperation({
    summary: 'Check if user exists by email',
    description:
      'Checks if a user exists in the authentication service by email.',
  })
  async existsByEmail(
    @Param('email') email: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: boolean = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.exists_by_email', email),
      );

      return new ApiResponse(
        'User existence checked successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('find-by-username/:username')
  @ApiOperation({
    summary: 'Find user by username',
    description:
      'Retrieves a user from the authentication service by username.',
  })
  async findByUsername(
    @Param('username') username: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponse = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.find_by_username', username),
      );

      return new ApiResponse(
        'User retrieved successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }
  @Get('find-by-email/:email')
  @ApiOperation({
    summary: 'Find user by email',
    description: 'Retrieves a user from the authentication service by email.',
  })
  async findByEmail(
    @Param('email') email: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponse = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.find_by_email', email),
      );

      return new ApiResponse(
        'User retrieved successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Put('update-password/:userId')
  @ApiOperation({
    summary: 'Update user password',
    description:
      'Updates the password of an existing user in the authentication service.',
  })
  async updatePassword(
    @Param('userId') userId: string,
    @Body()
    changePassword: ChangePasswordUserRequest,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponse = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.update_password', {
          userId,
          changePassword,
        }),
      );

      return new ApiResponse(
        'User password updated successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('find-by-refresh-token')
  @ApiOperation({
    summary: 'Find user by refresh token',
    description:
      'Retrieves a user from the authentication service by refresh token.',
  })
  async findByRefreshToken(
    @Query('token') token: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponse = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.user.find_by_refresh_token',
          token,
        ),
      );

      return new ApiResponse(
        'User retrieved successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Delete('soft-delete/:userId')
  @ApiOperation({
    summary: 'Soft delete user',
    description: 'Soft deletes a user in the authentication service.',
  })
  async softDelete(
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: void = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.soft_delete', userId),
      );

      return new ApiResponse(
        'User soft deleted successfully',
        null,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Put('restore/:userId')
  @ApiOperation({
    summary: 'Restore user',
    description: 'Restores a soft-deleted user in the authentication service.',
  })
  async restore(
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponse = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.restore', userId),
      );

      return new ApiResponse(
        'User restored successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Put('increment-failed-attempts/:userId')
  @ApiOperation({
    summary: 'Increment failed login attempts',
    description:
      'Increments the failed login attempts counter for a user in the authentication service.',
  })
  async incrementFailedAttempts(
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: void = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.user.increment_failed_attempts',
          userId,
        ),
      );

      return new ApiResponse(
        'Failed login attempts incremented successfully',
        null,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Put('reset-failed-attempts/:userId')
  @ApiOperation({
    summary: 'Reset failed login attempts',
    description:
      'Resets the failed login attempts counter for a user in the authentication service.',
  })
  async resetFailedAttempts(
    @Param('userId') userId: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: void = await sendKafkaRequest(
        this.clientKafka.send(
          'authentication.user.reset_failed_attempts',
          userId,
        ),
      );

      return new ApiResponse(
        'Failed login attempts reset successfully',
        null,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('verify-credentials')
  @ApiOperation({
    summary: 'Verify user credentials',
    description: 'Verifies user credentials in the authentication service.',
  })
  async verifyCredentials(
    @Query('username') username: string,
    @Query('password') password: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponse = await sendKafkaRequest(
        this.clientKafka.send('authentication.user.verify_credentials', {
          username,
          password,
        }),
      );

      return new ApiResponse(
        'User credentials verified successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('find-all')
  @ApiOperation({
    summary: 'Find all users',
    description: 'Retrieves all users from the authentication service.',
  })
  async findAll(
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponseWithRolesAndPermissionsResponse =
        await sendKafkaRequest(
          this.clientKafka.send('authentication.user.find_all', {
            limit,
            offset,
          }),
        );

      return new ApiResponse(
        'Users retrieved successfully',
        response,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }

  @Get('get-profile/:usernameOrEmail')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieves a user profile from the authentication service.',
  })
  async getProfile(
    @Param('usernameOrEmail') usernameOrEmail: string,
    @Req() request: Request,
  ): Promise<ApiResponse> {
    try {
      const response: UserResponseWithRolesAndPermissionsResponse =
        await sendKafkaRequest(
          this.clientKafka.send(
            'authentication.user.get_profile',
            usernameOrEmail,
          ),
        );

      const { passwordHash, ...user } = response;

      return new ApiResponse(
        'User profile retrieved successfully',
        user,
        request.url,
      );
    } catch (error) {
      throw new RpcException(error);
    }
  }
}
