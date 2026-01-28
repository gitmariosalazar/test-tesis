import { UserResponse } from '../../../users/domain/schemas/dto/response/user.response';
import { AuthRequest } from '../../domain/schemas/dto/request/auth.request';
import { CreateRefreshTokenRequest } from '../../domain/schemas/dto/request/create.refresh-token.request';
import { RefreshTokenRequest } from '../../domain/schemas/dto/request/refresh-token.request';
import { AuthResponse } from '../../domain/schemas/dto/response/auth.response';

/**
 * Interfaz del repositorio de autenticación (solo operaciones de auth y seguridad).
 * - No incluye CRUD de usuarios ni roles/permisos.
 * - Retorna UserResponse seguro (sin passwordHash).
 * - Lanza excepciones específicas.
 */
export interface InterfaceAuthUseCase {
  // Autenticación principal
  authenticateUser(authRequest: AuthRequest): Promise<AuthResponse>;

  // Gestión de tokens y sesiones
  refreshToken(refreshRequest: RefreshTokenRequest): Promise<AuthResponse>;
  invalidateAllRefreshTokens(userId: string): Promise<void>;
  findByRefreshToken(token: string): Promise<UserResponse | null>;

  // Seguridad y bloqueo
  lockAccount(userId: string, durationMinutes: number): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;

  // Cambio de contraseña y recuperación
  initiatePasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;

  // Refresh token management
  storeRefreshToken(refreshToken: CreateRefreshTokenRequest): Promise<void>;
  deleteRefreshToken(jti: string): Promise<boolean>;

  // 2FA (opcional pero recomendado)
  /*
  enableTwoFactor(userId: string, secret: string): Promise<void>;
  disableTwoFactor(userId: string): Promise<void>;
  verifyTwoFactorCode(userId: string, code: string): Promise<boolean>;
  */
}
