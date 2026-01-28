import { Controller } from '@nestjs/common';
import { RolService } from '../../application/services/rol.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateRolRequest } from '../../domain/schemas/dto/request/create.rol.request';
import { UpdateRolRequest } from '../../domain/schemas/dto/request/update.rol.request';

@Controller('rol')
export class RolController {
  // Implement controller methods here
  constructor(private readonly rolService: RolService) {}

  @MessagePattern('authentication.roles.get_rol_by_id')
  async getRolById(@Payload() rolId: number) {
    return this.rolService.getRolById(rolId);
  }

  @MessagePattern('authentication.roles.get_all_rols')
  async getAllRols(@Payload() payload: { limit: number; offset: number }) {
    const { limit, offset } = payload;
    return this.rolService.getAllRols(limit, offset);
  }

  @MessagePattern('authentication.roles.create_rol')
  async createRol(@Payload() rolData: CreateRolRequest) {
    return this.rolService.createRol(rolData);
  }

  @MessagePattern('authentication.roles.update_rol')
  async updateRol(
    @Payload() payload: { rolId: number; rolData: UpdateRolRequest },
  ) {
    const { rolId, rolData } = payload;
    return this.rolService.updateRol(rolId, rolData);
  }
}
