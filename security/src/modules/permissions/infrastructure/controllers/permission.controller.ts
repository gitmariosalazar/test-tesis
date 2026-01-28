import { Controller } from '@nestjs/common';
import { PermissionService } from '../../application/services/permission.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreatePermissionRequest } from '../../domain/schemas/dto/request/create.permission.request';
import { UpdatePermissionRequest } from '../../domain/schemas/dto/request/update.permission.request';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @MessagePattern('authentication.permission.verify-permission-exists-by-name')
  async verifyPermissionExistsByName(
    @Payload() permissionName: string,
  ): Promise<boolean> {
    return this.permissionService.verifyPermissionExistsByName(permissionName);
  }

  @MessagePattern('authentication.permission.get-permission-by-id')
  async getPermissionById(@Payload() permissionId: number) {
    return this.permissionService.getPermissionById(permissionId);
  }

  @MessagePattern('authentication.permission.get-all-permissions')
  async getAllPermissions() {
    return this.permissionService.getAllPermissions();
  }

  @MessagePattern('authentication.permission.create-permission')
  async createPermission(@Payload() permission: CreatePermissionRequest) {
    return this.permissionService.createPermission(permission);
  }

  @MessagePattern('authentication.permission.update-permission')
  async updatePermission(
    @Payload()
    data: {
      permissionId: number;
      permission: UpdatePermissionRequest;
    },
  ) {
    const { permissionId, permission } = data;
    return this.permissionService.updatePermission(permissionId, permission);
  }

  @MessagePattern('authentication.permission.delete-permission')
  async deletePermission(@Payload() permissionId: number) {
    return this.permissionService.deletePermission(permissionId);
  }
}
