import { Inject, Injectable } from '@nestjs/common';
import { InterfacePermissionRepository } from '../../domain/contracts/permission.interface.repository';
import { InterfacePermissionUseCase } from '../usecases/permission.use-case.interface';
import { RpcException } from '@nestjs/microservices';
import { statusCode } from '../../../../settings/environments/status-code';
import { PermissionResponse } from '../../domain/schemas/dto/response/permission.response';
import { CreatePermissionRequest } from '../../domain/schemas/dto/request/create.permission.request';
import { validateFields } from '../../../../shared/validators/fields.validators';
import { PermissionModel } from '../../domain/schemas/models/permission.model';
import { PermissionMapper } from '../mappers/permission.mapper';
import { UpdatePermissionRequest } from '../../domain/schemas/dto/request/update.permission.request';

@Injectable()
export class PermissionService implements InterfacePermissionUseCase {
  constructor(
    @Inject('PermissionRepository')
    private readonly permissionRepository: InterfacePermissionRepository,
  ) {}

  async verifyPermissionExistsByName(permissionName: string): Promise<boolean> {
    try {
      if (!permissionName || permissionName.trim() === '') {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Permission name must be provided',
        });
      }
      const exists =
        await this.permissionRepository.verifyPermissionExistsByName(
          permissionName,
        );
      return exists;
    } catch (error) {
      throw error;
    }
  }

  async getPermissionById(permissionId: number): Promise<PermissionResponse> {
    try {
      if (!permissionId || permissionId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Permission ID must be a positive number',
        });
      }

      const permission =
        await this.permissionRepository.getPermissionById(permissionId);
      if (!permission) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Permission with ID ${permissionId} not found`,
        });
      }
      return permission;
    } catch (error) {
      throw error;
    }
  }

  async getAllPermissions(): Promise<PermissionResponse[]> {
    try {
      const permissions = await this.permissionRepository.getAllPermissions();

      if (permissions.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: 'No permissions found',
        });
      }

      return permissions;
    } catch (error) {
      throw error;
    }
  }

  async createPermission(
    permission: CreatePermissionRequest,
  ): Promise<PermissionResponse> {
    try {
      const requiredFields: string[] = [
        'permissionName',
        'permissionDescription',
        'categoryId',
      ];
      const missingFieldsMessages: string[] = validateFields(
        permission,
        requiredFields,
      );

      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: `Missing or invalid fields: ${missingFieldsMessages.join(', ')}`,
        });
      }

      const permissionExists =
        await this.permissionRepository.verifyPermissionExistsByName(
          permission.permissionName,
        );

      if (permissionExists) {
        throw new RpcException({
          statusCode: statusCode.CONFLICT,
          message: `Permission with name ${permission.permissionName} already exists`,
        });
      }

      const permissionModel: PermissionModel =
        PermissionMapper.fromCreatePermissionRequestToPermissionModel(
          permission,
        );

      const newPermission =
        await this.permissionRepository.createPermission(permissionModel);

      if (!newPermission) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to create permission',
        });
      }

      return newPermission;
    } catch (error) {
      throw error;
    }
  }

  async updatePermission(
    permissionId: number,
    permission: UpdatePermissionRequest,
  ): Promise<PermissionResponse> {
    try {
      if (!permissionId || permissionId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Permission ID must be a positive number',
        });
      }

      const existingPermission: PermissionResponse | null =
        await this.permissionRepository.getPermissionById(permissionId);
      if (!existingPermission) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Permission with ID ${permissionId} not found`,
        });
      }

      const existingPermissionModel: PermissionModel =
        PermissionMapper.fromPermissionResponseToPermissionModel(
          existingPermission,
        );

      if (
        permission.permissionName &&
        permission.permissionName !== existingPermission.permissionName
      ) {
        const permissionExists =
          await this.permissionRepository.verifyPermissionExistsByName(
            permission.permissionName,
          );

        if (permissionExists) {
          throw new RpcException({
            statusCode: statusCode.CONFLICT,
            message: `Permission with name ${permission.permissionName} already exists`,
          });
        }
      }

      const permissionModel: PermissionModel =
        PermissionMapper.fromUpdatePermissionRequestToPermissionModel(
          permissionId,
          permission,
          existingPermissionModel,
        );

      const updatedPermission =
        await this.permissionRepository.updatePermission(
          permissionId,
          permissionModel,
        );

      if (!updatedPermission) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update permission',
        });
      }

      return updatedPermission;
    } catch (error) {
      throw error;
    }
  }

  async deletePermission(permissionId: number): Promise<boolean> {
    try {
      if (!permissionId || permissionId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Permission ID must be a positive number',
        });
      }

      const existingPermission: PermissionResponse | null =
        await this.permissionRepository.getPermissionById(permissionId);
      if (!existingPermission) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Permission with ID ${permissionId} not found`,
        });
      }

      const deleted =
        await this.permissionRepository.deletePermission(permissionId);

      if (deleted === false) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete permission',
        });
      }

      return true;
    } catch (error) {
      throw error;
    }
  }
}
