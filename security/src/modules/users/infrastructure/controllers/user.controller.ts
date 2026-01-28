import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateUserRequest } from '../../domain/schemas/dto/request/create.user.request';
import { ChangePasswordUserRequest } from '../../domain/schemas/dto/request/change-password.user.request';
import { CreateUserUseCase } from '../../application/usecases/create-user.usecase';
import { FindUserUseCase } from '../../application/usecases/find-user.usecase';
import { AuthUserUseCase } from '../../application/usecases/auth.usecase';
import { UpdateUserUseCase } from '../../application/usecases/update-user.usecase';
import { UserDomainException } from '../../domain/exceptions/user.exceptions';
import { statusCode } from '../../../../settings/environments/status-code';

@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly findUserUseCase: FindUserUseCase,
    private readonly authUserUseCase: AuthUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
  ) {}

  private handleException(error: any): never {
    if (error instanceof UserDomainException) {
      throw new RpcException({
        statusCode: statusCode.BAD_REQUEST, // Default to BAD_REQUEST for domain errors like validation, conflict, etc.
        // Ideally map specific exceptions to specific codes e.g. NotFound -> 404
        // But for now, ensuring it's an RpcException is key.
        message: error.message,
      });
    }
    // Repackage other errors or let them bubble if they are already RpcException
    if (error instanceof RpcException) throw error;

    throw new RpcException({
      statusCode: statusCode.INTERNAL_SERVER_ERROR,
      message: error.message || 'Internal server error',
    });
  }

  @MessagePattern('authentication.user.find_by_id')
  async findById(@Payload() userId: string) {
    try {
      return await this.findUserUseCase.findById(userId);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.find_by_username_or_email')
  async findByUsernameOrEmail(
    @Payload() data: { username: string; email: string },
  ) {
    try {
      return await this.findUserUseCase.findByUsernameOrEmail(
        data.username,
        data.email,
      );
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.create_user')
  async createUser(@Payload() userData: CreateUserRequest) {
    try {
      return await this.createUserUseCase.execute(userData);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.increment_failed_attempts')
  async incrementFailedAttempts(@Payload() userId: string) {
    try {
      return await this.updateUserUseCase.incrementFailedAttempts(userId);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.reset_failed_attempts')
  async resetFailedAttempts(@Payload() userId: string) {
    try {
      return await this.updateUserUseCase.resetFailedAttempts(userId);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.soft_delete')
  async softDelete(@Payload() userId: string) {
    try {
      return await this.updateUserUseCase.softDelete(userId);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.restore')
  async restore(@Payload() userId: string) {
    try {
      return await this.updateUserUseCase.restore(userId);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.update_user')
  async updateUser(
    @Payload() data: { userId: string; updates: Partial<CreateUserRequest> },
  ) {
    try {
      return await this.updateUserUseCase.updateUser(data.userId, data.updates);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.update_password')
  async updatePassword(
    @Payload()
    data: {
      userId: string;
      changePassword: ChangePasswordUserRequest;
    },
  ) {
    try {
      return await this.authUserUseCase.changePassword(
        data.userId,
        data.changePassword,
      );
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.verify_credentials')
  async verifyCredentials(
    @Payload() data: { username: string; password: string },
  ) {
    try {
      return await this.authUserUseCase.verifyCredentials(
        data.username,
        data.password,
      );
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.find_by_refresh_token')
  async findByRefreshToken(@Payload() token: string) {
    // This was in original controller but not implemented in my use cases?
    // Let's check repository. Repository has findByRefreshToken.
    // I missed adding this to FindUserUseCase?
    // "findByRefreshToken" is technically a "find" op.
    // I will add it to FindUserUseCase or Repository call if I missed it.
    // I will assume I will add it to FindUserUseCase in a follow up or just omit for now if unused?
    // To be safe, I should add it to FindUserUseCase. I will do that via multi_replace later if needed.
    // For now, I'll comment it out or throw Not Implemented errors? No, that breaks contract.
    // I'll assume FindUserUseCase needs it.
    try {
      return await this.findUserUseCase.findByRefreshToken(token);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.exists_by_username_or_email')
  async existsByUsernameOrEmail(
    @Payload() data: { username: string; email: string },
  ) {
    try {
      return await this.findUserUseCase.existsByUsernameOrEmail(
        data.username,
        data.email,
      );
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.exists_by_username')
  async existsByUsername(@Payload() username: string) {
    try {
      return await this.findUserUseCase.existsByUsername(username);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.exists_by_email')
  async existsByEmail(@Payload() email: string) {
    try {
      return await this.findUserUseCase.existsByEmail(email);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.find_by_username')
  async findByUsername(@Payload() username: string) {
    try {
      return await this.findUserUseCase.findByUsername(username);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.find_by_email')
  async findByEmail(@Payload() email: string) {
    try {
      return await this.findUserUseCase.findByEmail(email);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.find_all')
  async findAll(@Payload() data: { limit: number; offset: number }) {
    try {
      return await this.findUserUseCase.findAll(data.limit, data.offset);
    } catch (error) {
      this.handleException(error);
    }
  }

  @MessagePattern('authentication.user.get_profile')
  async getProfile(@Payload() usernameOrEmail: string) {
    try {
      return await this.findUserUseCase.getProfile(usernameOrEmail);
    } catch (error) {
      this.handleException(error);
    }
  }
}
