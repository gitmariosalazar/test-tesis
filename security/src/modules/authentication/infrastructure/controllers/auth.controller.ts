import { Controller } from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthRequest } from '../../domain/schemas/dto/request/auth.request';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('authentication.auth.signin')
  async authenticateUser(@Payload() payload: AuthRequest) {
    return this.authService.authenticateUser(payload);
  }
}
