import { Inject, Injectable } from '@nestjs/common';
import { InterfaceRolPermissionRepository } from '../../domain/contracts/rol-permission.interface.repository';
import { InterfaceRolPermissionUseCase } from '../usecases/rol-permission.use-case.interface';
import { RpcException } from '@nestjs/microservices';
import { RolPermissionResponse } from '../../domain/schemas/dto/response/rol-permission.response';
import { CreateRolPermissionRequest } from '../../domain/schemas/dto/request/create.rol-permission.request';
import { RolPermissionModel } from '../../domain/schemas/models/rol-permission.model';
import { RolPermissionMapper } from '../mappers/rol-permission.mapper';
import { UpdateRolPermissionRequest } from '../../domain/schemas/dto/request/update.rol-permission.request';
import { statusCode } from '../../../../settings/environments/status-code';
import { validateFields } from '../../../../shared/validators/fields.validators';

@Injectable()
export class RolPermissionService implements InterfaceRolPermissionUseCase {
  constructor(
    @Inject('RolPermissionRepository')
    private readonly rolPermissionRepository: InterfaceRolPermissionRepository,
  ) {}

  async verifyRolPermissionExists(
    rolId: number,
    permissionId: number,
  ): Promise<boolean> {
    try {
      if (!rolId || !permissionId || rolId <= 0 || permissionId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Invalid rolId or permissionId',
        });
      }

      const exists =
        await this.rolPermissionRepository.verifyRolPermissionExists(
          rolId,
          permissionId,
        );
      return exists;
    } catch (error) {
      throw error;
    }
  }

  async getRolPermissionById(
    rolPermissionId: number,
  ): Promise<RolPermissionResponse | null> {
    try {
      if (!rolPermissionId || rolPermissionId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Invalid rolPermissionId',
        });
      }

      const rolPermission =
        await this.rolPermissionRepository.getRolPermissionById(
          rolPermissionId,
        );

      if (rolPermission === null) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `RolPermission with ID ${rolPermissionId} not found`,
        });
      }

      return rolPermission;
    } catch (error) {
      throw error;
    }
  }

  async getAllRolPermissions(
    limit: number,
    offset: number,
  ): Promise<RolPermissionResponse[]> {
    try {
      if (limit <= 0 || offset < 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Invalid limit or offset',
        });
      }

      const rolPermissions =
        await this.rolPermissionRepository.getAllRolPermissions(limit, offset);

      if (rolPermissions.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: 'No rol permissions found',
        });
      }

      return rolPermissions;
    } catch (error) {
      throw error;
    }
  }

  async createRolPermission(
    rolPermission: CreateRolPermissionRequest,
  ): Promise<RolPermissionResponse | null> {
    try {
      const requiredFields: string[] = ['rolId', 'permissionId'];
      const missingFieldsMessages: string[] = validateFields(
        rolPermission,
        requiredFields,
      );

      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldsMessages,
        });
      }

      const verifyExists =
        await this.rolPermissionRepository.verifyRolPermissionExists(
          rolPermission.rolId,
          rolPermission.permissionId,
        );

      if (verifyExists) {
        throw new RpcException({
          statusCode: statusCode.CONFLICT,
          message: `RolPermission with rolId ${rolPermission.rolId} and permissionId ${rolPermission.permissionId} already exists`,
        });
      }

      const rolPermissionModel: RolPermissionModel =
        RolPermissionMapper.fromCreateRolPermisionRequestToRolPermissionModel(
          rolPermission,
        );

      const createdRolPermission =
        await this.rolPermissionRepository.createRolPermission(
          rolPermissionModel,
        );

      if (createdRolPermission === null) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to create rol permission',
        });
      }

      return createdRolPermission;
    } catch (error) {
      throw error;
    }
  }

  async updateRolPermission(
    rolPermissionId: number,
    rolPermission: UpdateRolPermissionRequest,
  ): Promise<RolPermissionResponse | null> {
    try {
      if (!rolPermissionId || rolPermissionId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Invalid rolPermissionId',
        });
      }

      const requiredFields: string[] = ['rolId', 'permissionId'];
      const missingFieldsMessages: string[] = validateFields(
        rolPermission,
        requiredFields,
      );

      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldsMessages,
        });
      }

      const existingRolPermission: RolPermissionResponse | null =
        await this.rolPermissionRepository.getRolPermissionById(
          rolPermissionId,
        );

      if (existingRolPermission === null) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `RolPermission with ID ${rolPermissionId} not found`,
        });
      }

      const rolPermissionModel: RolPermissionModel =
        RolPermissionMapper.fromUpdateRolPermissionRequestToRolPermissionModel(
          rolPermissionId,
          rolPermission,
          RolPermissionMapper.fromRolPermissionResponseToRolPermissionModel(
            existingRolPermission,
          ),
        );

      const updatedRolPermission =
        await this.rolPermissionRepository.updateRolPermission(
          rolPermissionId,
          rolPermissionModel,
        );

      if (updatedRolPermission === null) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update rol permission',
        });
      }

      return updatedRolPermission;
    } catch (error) {
      throw error;
    }
  }

  async deleteRolPermission(rolPermissionId: number): Promise<boolean> {
    try {
      if (!rolPermissionId || rolPermissionId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Invalid rolPermissionId',
        });
      }

      const existingRolPermission: RolPermissionResponse | null =
        await this.rolPermissionRepository.getRolPermissionById(
          rolPermissionId,
        );

      if (existingRolPermission === null) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `RolPermission with ID ${rolPermissionId} not found`,
        });
      }

      const deleted =
        await this.rolPermissionRepository.deleteRolPermission(rolPermissionId);

      if (!deleted) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete rol permission',
        });
      }

      return true;
    } catch (error) {
      throw error;
    }
  }
}
