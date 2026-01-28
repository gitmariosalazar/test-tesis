import { Inject, Injectable } from '@nestjs/common';
import { InterfaceRolRepository } from '../../domain/contracts/rol.interface.repository';
import { InterfaceRolUseCase } from '../usecases/rol.use-case.interface';
import { CreateRolRequest } from '../../domain/schemas/dto/request/create.rol.request';
import { RolResponse } from '../../domain/schemas/dto/response/rol.response';
import { validateFields } from '../../../../shared/validators/fields.validators';
import { RpcException } from '@nestjs/microservices';
import { RolMapper } from '../mappers/rol.mapper';
import { RolModel } from '../../domain/schemas/models/rol.model';
import { statusCode } from '../../../../settings/environments/status-code';
import { UpdateRolRequest } from '../../domain/schemas/dto/request/update.rol.request';

@Injectable()
export class RolService implements InterfaceRolUseCase {
  constructor(
    @Inject('RolRepository')
    private readonly rolRepository: InterfaceRolRepository,
  ) {}

  async createRol(
    createRolRequest: CreateRolRequest,
  ): Promise<RolResponse | null> {
    try {
      const requiredFields: string[] = ['name'];
      const missingFieldsMessages: string[] = validateFields(
        createRolRequest,
        requiredFields,
      );

      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: 400,
          message: missingFieldsMessages,
        });
      }

      const rolModel: RolModel =
        RolMapper.fromCreateRolRequestToRolModel(createRolRequest);

      const createdRol: RolResponse | null =
        await this.rolRepository.createRol(rolModel);

      if (createdRol === null) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to create rol',
        });
      }

      if (createdRol) {
        return createdRol;
      } else {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to create rol',
        });
      }
    } catch (error) {
      throw error;
    }
  }

  async updateRol(
    rolId: number,
    updateRolRequest: UpdateRolRequest,
  ): Promise<RolResponse | null> {
    try {
      if (isNaN(rolId) || rolId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Invalid rol ID',
        });
      }

      const existingRolResponse: RolResponse | null =
        await this.rolRepository.getRolById(rolId);

      if (existingRolResponse === null) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Rol with ID ${rolId} not found`,
        });
      }

      const requiredFields: string[] = ['name'];
      const missingFieldsMessages: string[] = validateFields(
        updateRolRequest,
        requiredFields,
      );

      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldsMessages,
        });
      }

      const existingRolModel: RolModel =
        RolMapper.fromResponseToRolModel(existingRolResponse);

      const rolModel: RolModel = RolMapper.fromUpdateRolRequestToRolModel(
        updateRolRequest,
        existingRolModel,
      );

      const updatedRol: RolResponse | null = await this.rolRepository.updateRol(
        rolId,
        rolModel,
      );

      if (updatedRol === null) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update rol',
        });
      }

      if (updatedRol) {
        return updatedRol;
      } else {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update rol',
        });
      }
    } catch (error) {
      throw error;
    }
  }

  async getRolById(rolId: number): Promise<RolResponse | null> {
    try {
      if (isNaN(rolId) || rolId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Invalid rol ID',
        });
      }

      const rol: RolResponse | null =
        await this.rolRepository.getRolById(rolId);

      if (rol === null) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Rol with ID ${rolId} not found`,
        });
      }

      return rol;
    } catch (error) {
      throw error;
    }
  }

  async getAllRols(limit: number, offset: number): Promise<RolResponse[]> {
    try {
      const rols: RolResponse[] = await this.rolRepository.getAllRols(
        limit,
        offset,
      );

      if (rols.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: 'No rols found',
        });
      }

      return rols;
    } catch (error) {
      throw error;
    }
  }
}
