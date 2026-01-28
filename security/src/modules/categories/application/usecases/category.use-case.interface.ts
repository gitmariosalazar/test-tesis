import { CreateCategoryRequest } from '../../domain/schemas/dto/request/create.category.request';
import { UpdateCategoryRequest } from '../../domain/schemas/dto/request/update.category.request';
import { CategoryResponse } from '../../domain/schemas/dto/response/category.response';

export interface InterfaceCategoryUseCase {
  createCategory(
    categoryRequest: CreateCategoryRequest,
  ): Promise<CategoryResponse | null>;
  getCategoryById(categoryId: number): Promise<CategoryResponse | null>;
  getAllCategories(limit: number, offset: number): Promise<CategoryResponse[]>;
  updateCategory(
    categoryId: number,
    categoryRequest: UpdateCategoryRequest,
  ): Promise<CategoryResponse | null>;
  deleteCategory(categoryId: number): Promise<boolean>;
  verifyCategoryExistsByName(categoryName: string): Promise<boolean>;
}
