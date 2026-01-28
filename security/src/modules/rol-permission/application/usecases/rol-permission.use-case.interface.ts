import { CreateRolPermissionRequest } from '../../domain/schemas/dto/request/create.rol-permission.request';
import { UpdateRolPermissionRequest } from '../../domain/schemas/dto/request/update.rol-permission.request';
import { RolPermissionResponse } from '../../domain/schemas/dto/response/rol-permission.response';

export interface InterfaceRolPermissionUseCase {
  createRolPermission(
    rolPermission: CreateRolPermissionRequest,
  ): Promise<RolPermissionResponse | null>;
  deleteRolPermission(rolPermissionId: number): Promise<boolean>;
  updateRolPermission(
    rolPermissionId: number,
    rolPermission: UpdateRolPermissionRequest,
  ): Promise<RolPermissionResponse | null>;
  getRolPermissionById(
    rolPermissionId: number,
  ): Promise<RolPermissionResponse | null>;
  getAllRolPermissions(
    limit: number,
    offset: number,
  ): Promise<RolPermissionResponse[]>;
  verifyRolPermissionExists(
    rolId: number,
    permissionId: number,
  ): Promise<boolean>;
}
