import { ReadingModel } from '../schemas/model/reading.model';
import {
  ReadingBasicInfoResponse,
  ReadingInfoResponse,
} from '../../application/dtos/response/reading-basic.response';

export interface InterfaceReadingRepository {
  findReadingBasicInfo(
    cadastralKey: string,
  ): Promise<ReadingBasicInfoResponse[]>;
  updateCurrentReading(
    readingId: number,
    readingModel: ReadingModel,
  ): Promise<ReadingModel | null>;
  verifyReadingIfExist(readingId: number): Promise<boolean>;
  createReading(readingModel: ReadingModel): Promise<ReadingModel | null>;
  findReadingInfo(cadastralKey: string): Promise<ReadingInfoResponse[]>;
}
