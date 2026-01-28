import { Controller } from "@nestjs/common";
import { CategoryService } from "../../application/services/category.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CreateCategoryRequest } from "../../domain/schemas/dto/request/create.category.request";
import { UpdateCategoryRequest } from "../../domain/schemas/dto/request/update.category.request";

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
  ) { }
  
  @MessagePattern('authentication.categories.create_category')
  async createCategory(@Payload() categoryData: CreateCategoryRequest) {
    return this.categoryService.createCategory(categoryData);
  }

  @MessagePattern('authentication.categories.get_category_by_id')
  async getCategoryById(@Payload() categoryId: number) {
    return this.categoryService.getCategoryById(categoryId);
  }

  @MessagePattern('authentication.categories.get_all_categories')
  async getAllCategories(@Payload() paginationData: { limit: number; offset: number }) {
    return this.categoryService.getAllCategories(paginationData.limit, paginationData.offset);
  }

  @MessagePattern('authentication.categories.update_category')
  async updateCategory(@Payload() updateData: { categoryId: number; categoryDetails: UpdateCategoryRequest }) {
    return this.categoryService.updateCategory(updateData.categoryId, updateData.categoryDetails);
  }

  @MessagePattern('authentication.categories.delete_category')
  async deleteCategory(@Payload() categoryId: number) {
    return this.categoryService.deleteCategory(categoryId);
  }

  @MessagePattern('authentication.categories.verify_category_existence')
  async verifyCategoryExistence(@Payload() categoryName: string) {
    return this.categoryService.verifyCategoryExistsByName(categoryName);
  }
}