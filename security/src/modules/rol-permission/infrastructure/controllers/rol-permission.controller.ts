import { Controller } from '@nestjs/common';
import { RolPermissionService } from '../../application/services/rol-permission.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateRolPermissionRequest } from '../../domain/schemas/dto/request/create.rol-permission.request';

@Controller('rol-permission')
export class RolPermissionController {
  constructor(private readonly rolPermissionService: RolPermissionService) {}

  @MessagePattern('authentication.rol_permission.create_rol_permission')
  async createRolPermission(
    @Payload()
    rolPermission: CreateRolPermissionRequest,
  ) {
    return this.rolPermissionService.createRolPermission(rolPermission);
  }

  @MessagePattern('authentication.rol_permission.delete_rol_permission')
  async deleteRolPermission(@Payload() rolPermissionId: number) {
    return this.rolPermissionService.deleteRolPermission(rolPermissionId);
  }

  @MessagePattern('authentication.rol_permission.update_rol_permission')
  async updateRolPermission(
    @Payload()
    payload: {
      rolPermissionId: number;
      rolPermission: CreateRolPermissionRequest;
    },
  ) {
    return this.rolPermissionService.updateRolPermission(
      payload.rolPermissionId,
      payload.rolPermission,
    );
  }

  @MessagePattern('authentication.rol_permission.get_rol_permission_by_id')
  async getRolPermissionById(@Payload() rolPermissionId: number) {
    return this.rolPermissionService.getRolPermissionById(rolPermissionId);
  }

  @MessagePattern('authentication.rol_permission.get_all_rol_permissions')
  async getAllRolPermissions(
    @Payload() pagination: { limit: number; offset: number },
  ) {
    return this.rolPermissionService.getAllRolPermissions(
      pagination.limit,
      pagination.offset,
    );
  }

  @MessagePattern('authentication.rol_permission.verify_rol_permission_exists')
  async verifyRolPermissionExists(
    @Payload() payload: { rolId: number; permissionId: number },
  ) {
    return this.rolPermissionService.verifyRolPermissionExists(
      payload.rolId,
      payload.permissionId,
    );
  }
}
