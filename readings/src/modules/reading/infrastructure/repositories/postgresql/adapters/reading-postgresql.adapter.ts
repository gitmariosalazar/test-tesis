import {
  emails,
  phones,
  ReadingBasicInfoResponse,
  ReadingInfoResponse,
} from '../../../../application/dtos/response/reading-basic.response';
import { Reading } from '../../../../domain/entities/Reading';
import { ReadingResponse } from '../../../../application/dtos/response/reading.response';
import {
  AdvancedReportReadingsSQLResult,
  ClientEmailSQLResult,
  ClientPhoneSQLResult,
  ReadingBasicInfoSQLResult,
  ReadingInfoSQLResult,
  ReadingSQLResult,
} from '../../../interfaces/sql/reading-sql.result.interface';
import { AdvancedReportReadingsResponse } from '../../../../domain/contracts/reading-report.interface.repository';

export class ReadingPostgreSQLAdapter {
  static fromReadingPostgreSQLResultToReadingBasicInfoResponse(
    readingResultSQL: ReadingBasicInfoSQLResult,
  ): ReadingBasicInfoResponse {
    const response: ReadingBasicInfoResponse = {
      readingId: readingResultSQL.reading_id,
      previousReadingDate: readingResultSQL.previous_reading_date,
      cadastralKey: readingResultSQL.cadastral_key,
      cardId: readingResultSQL.card_id,
      clientName: readingResultSQL.client_name,
      address: readingResultSQL.address,
      previousReading: readingResultSQL.previous_reading,
      currentReading: readingResultSQL.current_reading,
      sector: readingResultSQL.sector,
      account: readingResultSQL.account,
      readingValue: readingResultSQL.reading_value,
      averageConsumption: readingResultSQL.average_consumption,
      meterNumber: readingResultSQL.meter_number,
      rateId: readingResultSQL.rate_id,
      rateName: readingResultSQL.rate_name,
    };
    return response;
  }

  static fromReadingPostgreSQLResultToReadingResponse(
    readingResultSQL: ReadingSQLResult,
  ): ReadingResponse {
    const response: ReadingResponse = {
      readingId: readingResultSQL.reading_id,
      connectionId: readingResultSQL.connection_id,
      readingDate: readingResultSQL.reading_date,
      readingTime: readingResultSQL.reading_time,
      sector: readingResultSQL.sector,
      account: readingResultSQL.account,
      cadastralKey: readingResultSQL.cadastral_key,
      readingValue: readingResultSQL.reading_value,
      sewerRate: readingResultSQL.sewer_rate,
      previousReading: readingResultSQL.previous_reading,
      currentReading: readingResultSQL.current_reading,
      rentalIncomeCode: readingResultSQL.rental_income_code,
      novelty: readingResultSQL.novelty,
      incomeCode: readingResultSQL.income_code,
    };
    return response;
  }

  static fromReadingSQLResultToReadingEntity(
    readingResultSQL: ReadingSQLResult,
  ): Reading {
    return new Reading(
      readingResultSQL.reading_id,
      readingResultSQL.connection_id,
      readingResultSQL.reading_date ?? new Date(), // Handle null if strictly required, or update Entity to accept null
      readingResultSQL.reading_time ?? '',
      readingResultSQL.sector,
      readingResultSQL.account,
      readingResultSQL.cadastral_key,
      readingResultSQL.reading_value ?? 0,
      readingResultSQL.sewer_rate ?? 0,
      readingResultSQL.previous_reading ?? 0,
      readingResultSQL.current_reading ?? 0,
      readingResultSQL.rental_income_code ?? 0,
      readingResultSQL.novelty,
      readingResultSQL.income_code,
      1, // default ID or fetch from DB
      '', // currentMonthReading placeholder
    );
  }

  static fromReadingPhonesPostgreSQLResultsToReadingPhonesResponses(
    clientPhones: ClientPhoneSQLResult[],
  ): phones[] {
    const phonesResponse = clientPhones.map((phone) => ({
      telefonoid: phone.telefono_id,
      numero: phone.numero,
    }));
    return phonesResponse;
  }

  static fromReadingEmailsPostgreSQLResultsToReadingEmailsResponses(
    clientEmails: ClientEmailSQLResult[],
  ): emails[] {
    const emailsResponse = clientEmails.map((email) => ({
      emailid: email.correo_electronico_id,
      email: email.correo,
    }));
    return emailsResponse;
  }

  static fromReadingPostgreSQLResultToReadingInfoResponse(
    readingResultSQL: ReadingInfoSQLResult,
  ): ReadingInfoResponse {
    const response: ReadingInfoResponse = {
      readingId: readingResultSQL.reading_id,
      previousReadingDate: readingResultSQL.previous_reading_date,
      readingTime: readingResultSQL.reading_time,
      cadastralKey: readingResultSQL.cadastral_key,
      cardId: readingResultSQL.card_id,
      clientName: readingResultSQL.client_name,
      clientPhones:
        this.fromReadingPhonesPostgreSQLResultsToReadingPhonesResponses(
          readingResultSQL.client_phones,
        ),
      clientEmails:
        this.fromReadingEmailsPostgreSQLResultsToReadingEmailsResponses(
          readingResultSQL.client_emails,
        ),
      address: readingResultSQL.address,
      previousReading: readingResultSQL.previous_reading,
      currentReading: readingResultSQL.current_reading,
      sector: readingResultSQL.sector,
      account: readingResultSQL.account,
      readingValue: readingResultSQL.reading_value,
      averageConsumption: readingResultSQL.average_consumption,
      meterNumber: readingResultSQL.meter_number,
      rateId: readingResultSQL.rate_id,
      rateName: readingResultSQL.rate_name,
      hasCurrentReading: readingResultSQL.has_current_reading,
      monthReading: readingResultSQL.month_reading,
      startDatePeriod: readingResultSQL.start_date_period,
      endDatePeriod: readingResultSQL.end_date_period,
    };
    return response;
  }

  static fromReadingPostgreSQLResultToAdvancedReportReadingsResponse(
    readingResultSQL: AdvancedReportReadingsSQLResult,
  ): AdvancedReportReadingsResponse {
    const response: AdvancedReportReadingsResponse = {
      sector: readingResultSQL.sector,
      totalConnections: readingResultSQL.total_connections,
      readingsCompleted: readingResultSQL.readings_completed,
      missingReadings: readingResultSQL.missing_readings,
      progressPercentage: readingResultSQL.progress_percentage,
    };
    return response;
  }
}
