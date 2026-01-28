import { CreatePermissionRequest } from '../../domain/schemas/dto/request/create.permission.request';
import { UpdatePermissionRequest } from '../../domain/schemas/dto/request/update.permission.request';
import { PermissionResponse } from '../../domain/schemas/dto/response/permission.response';

export interface InterfacePermissionUseCase {
  createPermission(
    permission: CreatePermissionRequest,
  ): Promise<PermissionResponse>;
  updatePermission(
    permissionId: number,
    permission: UpdatePermissionRequest,
  ): Promise<PermissionResponse>;
  deletePermission(permissionId: number): Promise<boolean>;
  getPermissionById(permissionId: number): Promise<PermissionResponse>;
  getAllPermissions(): Promise<PermissionResponse[]>;
  verifyPermissionExistsByName(permissionName: string): Promise<boolean>;
}
