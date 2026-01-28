import { Inject, Injectable } from '@nestjs/common';
import { InterfaceCategoryRepository } from '../../domain/contracts/category.interface.repository';
import { InterfaceCategoryUseCase } from '../usecases/category.use-case.interface';
import { RpcException } from '@nestjs/microservices';
import { statusCode } from '../../../../settings/environments/status-code';
import { CategoryResponse } from '../../domain/schemas/dto/response/category.response';
import { CreateCategoryRequest } from '../../domain/schemas/dto/request/create.category.request';
import { validateFields } from '../../../../shared/validators/fields.validators';
import { CategoryMapper } from '../mappers/category.mapper';
import { CategoryModel } from '../../domain/schemas/models/category.model';
import { UpdateCategoryRequest } from '../../domain/schemas/dto/request/update.category.request';

@Injectable()
export class CategoryService implements InterfaceCategoryUseCase {
  // Implement service methods here
  constructor(
    @Inject('CategoryRepository')
    private readonly categoryRepository: InterfaceCategoryRepository,
  ) {}

  async verifyCategoryExistsByName(categoryName: string): Promise<boolean> {
    try {
      if (!categoryName || categoryName.trim() === '') {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Category name must be provided and cannot be empty.',
        });
      }
      const categoryExists: boolean =
        await this.categoryRepository.verifyCategoryExistsByName(categoryName);
      return categoryExists;
    } catch (error) {
      throw error;
    }
  }

  async getCategoryById(categoryId: number): Promise<CategoryResponse | null> {
    try {
      if (!categoryId || categoryId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Category ID must be a positive number.',
        });
      }

      const category: CategoryResponse | null =
        await this.categoryRepository.getCategoryById(categoryId);

      if (!category) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Category with ID ${categoryId} not found`,
        });
      }

      return category;
    } catch (error) {
      throw error;
    }
  }

  async getAllCategories(
    limit: number,
    offset: number,
  ): Promise<CategoryResponse[]> {
    try {
      const categories: CategoryResponse[] =
        await this.categoryRepository.getAllCategories(limit, offset);

      if (categories.length === 0) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: 'No categories found.',
        });
      }

      return categories;
    } catch (error) {
      throw error;
    }
  }

  async createCategory(
    categoryRequest: CreateCategoryRequest,
  ): Promise<CategoryResponse | null> {
    try {
      const requiredFields: string[] = ['categoryName'];

      const missingFieldsMessages: string[] = validateFields(
        categoryRequest,
        requiredFields,
      );

      if (missingFieldsMessages.length > 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: missingFieldsMessages,
        });
      }

      const categoryExists: boolean =
        await this.categoryRepository.verifyCategoryExistsByName(
          categoryRequest.categoryName,
        );

      if (categoryExists) {
        throw new RpcException({
          statusCode: statusCode.CONFLICT,
          message: `Category with name ${categoryRequest.categoryName} already exists.`,
        });
      }

      const categoryModel: CategoryModel =
        CategoryMapper.fromCreateCategoryRequestToCategoryModel(
          categoryRequest,
        );

      const createdCategory: CategoryResponse | null =
        await this.categoryRepository.createCategory(categoryModel);

      return createdCategory;
    } catch (error) {
      throw error;
    }
  }

  async updateCategory(
    categoryId: number,
    categoryRequest: UpdateCategoryRequest,
  ): Promise<CategoryResponse | null> {
    try {
      if (!categoryId || categoryId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Category ID must be a positive number.',
        });
      }

      const existingCategory: CategoryResponse | null =
        await this.categoryRepository.getCategoryById(categoryId);

      if (!existingCategory) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Category with ID ${categoryId} not found.`,
        });
      }

      const existingCategoryModel: CategoryModel =
        CategoryMapper.fromCategoryResponseToCategoryModel(existingCategory);

      const categoryModel: CategoryModel =
        CategoryMapper.fromUpdateCategoryRequestToCategoryModel(
          categoryId,
          categoryRequest,
          existingCategoryModel,
        );

      const updatedCategory: CategoryResponse | null =
        await this.categoryRepository.updateCategory(categoryId, categoryModel);

      if (!updatedCategory) {
        throw new RpcException({
          statusCode: statusCode.INTERNAL_SERVER_ERROR,
          message: `Failed to update category with ID ${categoryId}.`,
        });
      }

      return updatedCategory;
    } catch (error) {
      throw error;
    }
  }

  async deleteCategory(categoryId: number): Promise<boolean> {
    try {
      if (!categoryId || categoryId <= 0) {
        throw new RpcException({
          statusCode: statusCode.BAD_REQUEST,
          message: 'Category ID must be a positive number.',
        });
      }

      const existingCategory: CategoryResponse | null =
        await this.categoryRepository.getCategoryById(categoryId);

      if (!existingCategory) {
        throw new RpcException({
          statusCode: statusCode.NOT_FOUND,
          message: `Category with ID ${categoryId} not found.`,
        });
      }

      const deleteResult: boolean =
        await this.categoryRepository.deleteCategory(categoryId);
      console.log('Delete result:', deleteResult);
      return deleteResult;
    } catch (error) {
      throw error;
    }
  }
}
