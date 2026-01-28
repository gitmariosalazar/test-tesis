import { CreateReadingRequest } from '../../application/dtos/request/create-reading.request';
import { UpdateReadingRequest } from '../../application/dtos/request/update-reading.request';
import {
  ReadingBasicInfoResponse,
  ReadingInfoResponse,
} from '../../application/dtos/response/reading-basic.response';
import { ReadingResponse } from '../../application/dtos/response/reading.response';

export interface InterfaceReadingUseCase {
  findReadingBasicInfo(
    cadastralKey: string,
  ): Promise<ReadingBasicInfoResponse[]>;
  updateCurrentReading(
    readingId: number,
    readinRequest: UpdateReadingRequest,
  ): Promise<ReadingResponse | null>;
  verifyReadingIfExist(readingId: number): Promise<boolean>;
  createReading(
    readingRequest: CreateReadingRequest,
  ): Promise<ReadingResponse | null>;
  findReadingInfo(cadastralKey: string): Promise<ReadingInfoResponse[]>;
}
