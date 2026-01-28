import { Inject, Injectable } from '@nestjs/common';
import { InterfaceUserEmployeeRepository } from '../../domain/contracts/user-employee.interface.repository';
import { UserEmployeeResponse } from '../../domain/schemas/dto/response/user-employee.response';
import {
  EmployeeDomainException,
  EmployeeNotFoundException,
} from '../../domain/exceptions/employee.exceptions';
import { UpdateUserEmployeeRequest } from '../../domain/schemas/dto/request/update.user-employee.request';
import { UserEmployeeMapper } from '../mappers/user-employee.mapper';

@Injectable()
export class UpdateEmployeeUseCase {
  constructor(
    @Inject('UserEmployeeRepository')
    private readonly userEmployeeRepository: InterfaceUserEmployeeRepository,
  ) {}

  async update(
    employeeId: string,
    updates: UpdateUserEmployeeRequest,
  ): Promise<UserEmployeeResponse> {
    if (!employeeId)
      throw new EmployeeDomainException('Employee ID is required');

    const existingEmployee =
      await this.userEmployeeRepository.findById(employeeId);
    if (!existingEmployee) throw new EmployeeNotFoundException(employeeId);

    const existingEmployeeModel =
      UserEmployeeMapper.fromUserEmployeeResponseToUserEmployeeModel(
        existingEmployee,
      );
    const updatedModel =
      UserEmployeeMapper.fromUpdateUserEmployeeRequestToUserEmployeeModel(
        employeeId,
        updates,
        existingEmployeeModel,
      );

    const result = await this.userEmployeeRepository.update(
      employeeId,
      updatedModel,
    );
    if (!result) throw new EmployeeDomainException('Failed to update employee');

    return result;
  }

  async softDelete(employeeId: string): Promise<void> {
    if (!employeeId)
      throw new EmployeeDomainException('Employee ID is required');
    const existing = await this.userEmployeeRepository.findById(employeeId);
    if (!existing) throw new EmployeeNotFoundException(employeeId);
    await this.userEmployeeRepository.softDelete(employeeId);
  }

  async restore(employeeId: string): Promise<UserEmployeeResponse> {
    if (!employeeId)
      throw new EmployeeDomainException('Employee ID is required');
    const restored = await this.userEmployeeRepository.restore(employeeId);
    if (!restored)
      throw new EmployeeDomainException('Failed to restore employee');
    return restored;
  }
}
