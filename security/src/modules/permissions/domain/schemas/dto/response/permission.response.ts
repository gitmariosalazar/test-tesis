export interface PermissionResponse {
  permissionId: number;
  permissionName: string;
  permissionDescription: string;
  isActive: boolean;
  categoryId: number;
  scoppes?: string;
}
