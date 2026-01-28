import { CreateReadingRequest } from '../dtos/request/create-reading.request';
import { UpdateReadingRequest } from '../dtos/request/update-reading.request';
import { Reading } from '../../domain/entities/Reading';
import { ReadingResponse } from '../dtos/response/reading.response';

export class ReadingMapper {
  static fromCreateReadingRequestToReadingModel(
    readingRequest: CreateReadingRequest,
  ): Reading {
    const [year, month] = readingRequest.previousMonthReading
      .split('-')
      .map(Number);
    const nextDate = new Date(year, month - 1 + 1, 1);
    const currentMonthReading = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    return new Reading(
      0, // ID
      readingRequest.connectionId,
      readingRequest.readingDate,
      readingRequest.readingTime,
      readingRequest.sector,
      readingRequest.account,
      readingRequest.cadastralKey,
      0, // readingValue
      readingRequest.sewerRate,
      readingRequest.previousReading,
      readingRequest.currentReading ?? 0,
      readingRequest.rentalIncomeCode ?? 0,
      readingRequest.novelty ?? 'NORMAL',
      readingRequest.incomeCode,
      readingRequest.typeNoveltyReadingId ?? 1,
      currentMonthReading,
    );
  }

  static fromUpdateReadingRequestToReadingModel(
    readingRequest: UpdateReadingRequest,
  ): Reading {
    const date: Date = new Date();
    const hour: string = date.getTime().toLocaleString();

    return new Reading(
      readingRequest.readingId,
      readingRequest.connectionId,
      date, // readingDate
      hour, // readingTime
      readingRequest.sector,
      readingRequest.account,
      readingRequest.cadastralKey,
      readingRequest.readingValue ?? 0,
      readingRequest.sewerRate ?? 0,
      readingRequest.previousReading ?? 0,
      readingRequest.currentReading ?? 0,
      readingRequest.rentalIncomeCode ?? 0,
      readingRequest.novelty ?? 'NORMAL',
      readingRequest.incomeCode ?? 0,
      1, // typeNoveltyReadingId (default or needs to be in request)
      '', // currentMonthReading (default or needs to be in request)
    );
  }
  static fromReadingEntityToReadingResponse(reading: Reading): ReadingResponse {
    const response: ReadingResponse = {
      readingId: reading.id,
      connectionId: reading.connectionId,
      readingDate: reading.readingDate,
      readingTime: reading.readingTime,
      sector: reading.sector,
      account: reading.account,
      cadastralKey: reading.cadastralKey,
      readingValue: reading.readingValue,
      sewerRate: reading.sewerRate,
      previousReading: reading.previousReading,
      currentReading: reading.currentReading,
      rentalIncomeCode: reading.rentalIncomeCode ?? 0,
      novelty: reading.novelty ?? '',
      incomeCode: reading.incomeCode ?? 0,
    };
    return response;
  }
}
