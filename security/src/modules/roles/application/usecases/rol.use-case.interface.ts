import { CreateRolRequest } from '../../domain/schemas/dto/request/create.rol.request';
import { UpdateRolRequest } from '../../domain/schemas/dto/request/update.rol.request';
import { RolResponse } from '../../domain/schemas/dto/response/rol.response';

export interface InterfaceRolUseCase {
  createRol(createRolRequest: CreateRolRequest): Promise<RolResponse | null>;
  updateRol(
    rolId: number,
    updateRolRequest: UpdateRolRequest,
  ): Promise<RolResponse | null>;
  getRolById(rolId: number): Promise<RolResponse | null>;
  getAllRols(limit: number, offset: number): Promise<RolResponse[]>;
}
