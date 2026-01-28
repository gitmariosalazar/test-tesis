import { Inject, Injectable } from '@nestjs/common';
import { InterfaceUserEmployeeRepository } from '../../domain/contracts/user-employee.interface.repository';
import { UserEmployeeResponse } from '../../domain/schemas/dto/response/user-employee.response';
import {
  EmployeeDomainException,
  EmployeeNotFoundException,
} from '../../domain/exceptions/employee.exceptions';

@Injectable()
export class ManageEmployeeUseCase {
  constructor(
    @Inject('UserEmployeeRepository')
    private readonly userEmployeeRepository: InterfaceUserEmployeeRepository,
  ) {}

  async assignZones(employeeId: string, zoneIds: number[]): Promise<void> {
    if (!employeeId)
      throw new EmployeeDomainException('Employee ID is required');
    if (!zoneIds || !Array.isArray(zoneIds))
      throw new EmployeeDomainException('Zone IDs must be an array');

    const existing = await this.userEmployeeRepository.findById(employeeId);
    if (!existing) throw new EmployeeNotFoundException(employeeId);

    await this.userEmployeeRepository.assignZones(employeeId, zoneIds);
  }

  async changeStatus(
    employeeId: string,
    newStatusId: number,
  ): Promise<UserEmployeeResponse> {
    if (!employeeId)
      throw new EmployeeDomainException('Employee ID is required');

    const existing = await this.userEmployeeRepository.findById(employeeId);
    if (!existing) throw new EmployeeNotFoundException(employeeId);

    const updated = await this.userEmployeeRepository.changeStatus(
      employeeId,
      newStatusId,
    );
    if (!updated) throw new EmployeeDomainException('Failed to change status');
    return updated;
  }

  async changeSupervisor(
    employeeId: string,
    supervisorId: string | null,
  ): Promise<UserEmployeeResponse> {
    if (!employeeId)
      throw new EmployeeDomainException('Employee ID is required');

    const existing = await this.userEmployeeRepository.findById(employeeId);
    if (!existing) throw new EmployeeNotFoundException(employeeId);

    const updated = await this.userEmployeeRepository.changeSupervisor(
      employeeId,
      supervisorId,
    );
    if (!updated)
      throw new EmployeeDomainException('Failed to change supervisor');
    return updated;
  }
}
