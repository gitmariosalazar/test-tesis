import { PermissionResponse } from '../../../../domain/schemas/dto/response/permission.response';
import { PermissionSQLResponse } from '../../../interfaces/sql/permission.sql.interface';

export class PermissionSQLAdapter {
  static toPermissionResponse(
    sqlResponse: PermissionSQLResponse,
  ): PermissionResponse {
    return {
      permissionId: sqlResponse.permission_id,
      permissionName: sqlResponse.permission_name,
      permissionDescription: sqlResponse.permission_description,
      isActive: sqlResponse.is_active,
      categoryId: sqlResponse.category_id,
      scoppes: sqlResponse.scoppes,
    };
  }
}
