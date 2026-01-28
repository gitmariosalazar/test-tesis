import { Reading } from '../entities/Reading';
import {
  ReadingBasicInfoResponse,
  ReadingInfoResponse,
} from '../../application/dtos/response/reading-basic.response';
import { ReadingResponse } from '../../application/dtos/response/reading.response';

export interface InterfaceReadingRepository {
  findReadingBasicInfo(
    cadastralKey: string,
  ): Promise<ReadingBasicInfoResponse[]>;
  updateCurrentReading(
    readingId: number,
    readingModel: Reading,
  ): Promise<Reading | null>;
  verifyReadingIfExist(readingId: number): Promise<boolean>;
  createReading(readingModel: Reading): Promise<Reading | null>;
  findReadingInfo(cadastralKey: string): Promise<ReadingInfoResponse[]>;
}
