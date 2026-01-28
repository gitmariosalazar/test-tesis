import { Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { statusCode } from '../../../../settings/environments/status-code';
import { InterfaceAuthRepository } from '../../domain/contracts/auth.interface.repository';
import { InterfaceAuthUseCase } from '../usecases/auth.use-case.interface';
import { AuthRequest } from '../../domain/schemas/dto/request/auth.request';
import { AuthResponse } from '../../domain/schemas/dto/response/auth.response';
import { RefreshTokenRequest } from '../../domain/schemas/dto/request/refresh-token.request';
import {
  UserResponse,
  UserResponseWithRolesAndPermissionsResponse,
} from '../../../users/domain/schemas/dto/response/user.response';
import { InterfaceUserRepository } from '../../../users/domain/contracts/user.interface.repository';
import { environments } from '../../../../settings/environments/environments';
import { validateFields } from '../../../../shared/validators/fields.validators';
import { parseExpirationToSeconds } from '../../../../shared/utils/time.util';
import { CreateRefreshTokenRequest } from '../../domain/schemas/dto/request/create.refresh-token.request';
import { RefreshTokenModel } from '../../domain/schemas/models/refresh-token.model';
import { AuthMapper } from '../mappers/auth.mapper';

@Injectable()
export class AuthService implements InterfaceAuthUseCase {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('AuthRepository')
    private readonly authRepository: InterfaceAuthRepository,
    @Inject('UserRepository')
    private readonly userRepository: InterfaceUserRepository,
    private readonly jwtService: JwtService,
  ) {}
  async authenticateUser(authRequest: AuthRequest): Promise<AuthResponse> {
    try {
      const requiredFields: string[] = ['username_or_email', 'password'];
      const missingFieldsMessages: string[] = validateFields(
        authRequest,
        requiredFields,
      );
      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldsMessages,
        });
      }

      const user: UserResponseWithRolesAndPermissionsResponse | null =
        await this.userRepository.findByUsernameOrEmailWithRolesAndPermissions(
          authRequest.username_or_email,
        );

      if (!user) {
        throw new RpcException({
          statusCode: statusCode.UNAUTHORIZED,
          message: 'Invalid credentials. Please try again!',
        });
      }

      const passwordMatches = await bcrypt.compare(
        authRequest.password,
        user.passwordHash || '',
      );

      console.log(passwordMatches, authRequest.password, user.passwordHash);

      if (!passwordMatches) {
        throw new RpcException({
          statusCode: statusCode.UNAUTHORIZED,
          message: 'Invalid credentials. Please try again.2',
        });
      }

      const payload = {
        sub: user.userId,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
      };

      const accessToken = this.jwtService.sign(payload, {
        secret: environments.JWT_SECRET,
        expiresIn: parseExpirationToSeconds(environments.JWT_ACCESS_EXPIRATION),
        algorithm: 'HS256',
      });

      const refreshToken = uuidv4();
      const jti = uuidv4();
      const expiresIn = parseExpirationToSeconds(
        environments.JWT_REFRESH_EXPIRATION,
      );

      const refreshTokenModel: RefreshTokenModel =
        AuthMapper.toRefreshTokenModel(
          new CreateRefreshTokenRequest(),
          refreshToken,
          jti,
          new Date(),
          new Date(),
        );

      await this.authRepository.storeRefreshToken(refreshTokenModel);

      const createAuthResponse: AuthResponse =
        AuthMapper.fromUserWithRolesAndPermissionsToUserResponse(
          user,
          refreshToken,
          accessToken,
        );

      return createAuthResponse;
    } catch (error) {
      throw error;
    }
  }
  async refreshToken(
    refreshRequest: RefreshTokenRequest,
  ): Promise<AuthResponse> {
    throw new Error('Method not implemented.');
  }
  async invalidateAllRefreshTokens(userId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async findByRefreshToken(token: string): Promise<UserResponse | null> {
    throw new Error('Method not implemented.');
  }
  async lockAccount(userId: string, durationMinutes: number): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async isAccountLocked(userId: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  async initiatePasswordReset(email: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async resetPassword(token: string, newPassword: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async storeRefreshToken(
    refreshToken: CreateRefreshTokenRequest,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async deleteRefreshToken(jti: string): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
