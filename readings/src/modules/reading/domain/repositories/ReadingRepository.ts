import { Reading } from '../entities/Reading';

// In a strict clean architecture, repositories return Entities.
// We can use a separate query service/repository for specific DTO projections if needed (CQRS),
// but for now, we'll keep it simple.

export interface ReadingRepository {
  findById(id: number): Promise<Reading | null>;
  findByCadastralKey(cadastralKey: string): Promise<Reading[]>;
  save(reading: Reading): Promise<Reading>;
  update(reading: Reading): Promise<Reading>;
  exists(id: number): Promise<boolean>;
}
