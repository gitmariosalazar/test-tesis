import { ReadingModel } from '../schemas/model/reading.model';

// In a strict clean architecture, repositories return Entities.
// We can use a separate query service/repository for specific DTO projections if needed (CQRS),
// but for now, we'll keep it simple.

export interface ReadingRepository {
  findById(id: number): Promise<ReadingModel | null>;
  findByCadastralKey(cadastralKey: string): Promise<ReadingModel[]>;
  save(reading: ReadingModel): Promise<ReadingModel>;
  update(reading: ReadingModel): Promise<ReadingModel>;
  exists(id: number): Promise<boolean>;
}
