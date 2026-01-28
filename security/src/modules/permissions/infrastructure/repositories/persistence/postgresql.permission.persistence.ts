import { Injectable } from '@nestjs/common';
import { DatabaseServicePostgreSQL } from '../../../../../shared/connections/database/postgresql/postgresql.service';
import { InterfacePermissionRepository } from '../../../domain/contracts/permission.interface.repository';
import { Exists } from '../../../../../shared/interfaces/verify-exists';
import { PermissionResponse } from '../../../domain/schemas/dto/response/permission.response';
import { PermissionSQLResponse } from '../../interfaces/sql/permission.sql.interface';
import { RpcException } from '@nestjs/microservices';
import { statusCode } from '../../../../../settings/environments/status-code';
import { PermissionSQLAdapter } from '../postgresql/adapters/permission.adapter';
import { PermissionModel } from '../../../domain/schemas/models/permission.model';

@Injectable()
export class PermissionPostgreSQLPersistence implements InterfacePermissionRepository {
  constructor(private readonly postgreSQLService: DatabaseServicePostgreSQL) {}

  async verifyPermissionExistsByName(permissionName: string): Promise<boolean> {
    try {
      const query: string = `
        SELECT EXISTS (
          SELECT 1
          FROM permisos
          WHERE nombre = $1
        ) AS exists;
      `;
      const params = [permissionName];

      const result = await this.postgreSQLService.query<Exists>(query, params);

      return result[0].exists;
    } catch (error) {
      throw error;
    }
  }

  async getPermissionById(
    permissionId: number,
  ): Promise<PermissionResponse | null> {
    try {
      const query: string = `
        SELECT
          permiso_id AS permission_id,
          nombre AS permission_name,
          descripcion AS permission_description,
          activo AS is_active,
          categoria_id AS category_id
        FROM permisos
        WHERE permiso_id = $1;
      `;
      const params = [permissionId];

      const result = await this.postgreSQLService.query<PermissionSQLResponse>(
        query,
        params,
      );

      if (result.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Permission with ID ${permissionId} not found`,
        });
      }

      const permission: PermissionResponse =
        PermissionSQLAdapter.toPermissionResponse(result[0]);

      return permission;
    } catch (error) {
      throw error;
    }
  }

  async getAllPermissions(): Promise<PermissionResponse[]> {
    try {
      const query: string = `
        SELECT
          permiso_id AS permission_id,
          nombre AS permission_name,
          descripcion AS permission_description,
          activo AS is_active,
          categoria_id AS category_id
        FROM permisos;
      `;

      const result = await this.postgreSQLService.query<PermissionSQLResponse>(
        query,
        [],
      );

      if (result.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: 'No permissions found',
        });
      }

      return result.map((permissionSql) =>
        PermissionSQLAdapter.toPermissionResponse(permissionSql),
      );
    } catch (error) {
      throw error;
    }
  }

  async deletePermission(permissionId: number): Promise<boolean> {
    try {
      const query: string = `
        DELETE FROM permisos
        WHERE permiso_id = $1;
      `;
      const params = [permissionId];

      const result = await this.postgreSQLService.query(query, params);

      return result.length > 0;
    } catch (error) {
      throw error;
    }
  }

  async createPermission(
    permission: PermissionModel,
  ): Promise<PermissionResponse | null> {
    try {
      const query: string = `
        INSERT INTO permisos (nombre, descripcion, activo, categoria_id)
        VALUES ($1, $2, $3, $4)
        RETURNING 
          permiso_id AS permission_id,
          nombre AS permission_name,
          descripcion AS permission_description,
          activo AS is_active,
          categoria_id AS category_id;
      `;
      const params = [
        permission.getName(),
        permission.getDescription(),
        permission.getIsActive(),
        permission.getCategoryId(),
      ];

      const result = await this.postgreSQLService.query<PermissionSQLResponse>(
        query,
        params,
      );

      if (result.length === 0) {
        return null;
      }

      const createdPermission: PermissionResponse =
        PermissionSQLAdapter.toPermissionResponse(result[0]);

      return createdPermission;
    } catch (error) {
      throw error;
    }
  }

  async updatePermission(
    permissionId: number,
    permission: PermissionModel,
  ): Promise<PermissionResponse | null> {
    try {
      const query: string = `
        UPDATE permisos
        SET nombre = $1,
            descripcion = $2,
            activo = $3,
            categoria_id = $4
        WHERE permiso_id = $5
        RETURNING 
          permiso_id AS permission_id,
          nombre AS permission_name,
          descripcion AS permission_description,
          activo AS is_active,
          categoria_id AS category_id;
      `;
      const params = [
        permission.getName(),
        permission.getDescription(),
        permission.getIsActive(),
        permission.getCategoryId(),
        permissionId,
      ];

      const result = await this.postgreSQLService.query<PermissionSQLResponse>(
        query,
        params,
      );

      if (result.length === 0) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to update permission',
        });
      }

      const updatedPermission: PermissionResponse =
        PermissionSQLAdapter.toPermissionResponse(result[0]);

      return updatedPermission;
    } catch (error) {
      throw error;
    }
  }
}
