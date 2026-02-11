import {
  PendingReadingResponse,
  ReadingResponse,
} from '../../../../domain/schemas/dto/response/readings.response';
import {
  PendingReadingSQLResult,
  ReadingSQLResult,
} from '../../../interfaces/reading.sql.response';

export class SQLServerReadingAdapter {
  static toDomain(data: ReadingSQLResult): ReadingResponse {
    return {
      sector: data.sector,
      account: data.account,
      year: data.year,
      month: data.month,
      previousReading: data.previousReading,
      currentReading: data.currentReading,
      rentalIncomeCode: data.rentalIncomeCode,
      novelty: data.novelty,
      readingValue: data.readingValue,
      sewerRate: data.sewerRate,
      reconnection: data.reconnection,
      incomeCode: data.incomeCode,
      readingDate: data.readingDate,
      readingTime: data.readingTime,
      cadastralKey: data.cadastralKey,
    };
  }

  static toDomain2000(data: ReadingSQLResult): ReadingResponse {
    return {
      sector: Number(data.sector),
      account: Number(data.account),
      year: Number(data.year),
      month: String(data.month).trim(),
      previousReading:
        data.previousReading != null ? Number(data.previousReading) : 0,
      currentReading:
        data.currentReading != null ? Number(data.currentReading) : null,
      rentalIncomeCode:
        data.rentalIncomeCode != null ? Number(data.rentalIncomeCode) : null,
      novelty: data.novelty ? String(data.novelty).trim() : null,
      readingValue:
        data.readingValue != null ? Number(data.readingValue) : null,
      sewerRate: data.sewerRate != null ? Number(data.sewerRate) : null,
      reconnection:
        data.reconnection != null ? Number(data.reconnection) : null,
      incomeCode: Number(data.incomeCode),
      readingDate: data.readingDate || null,
      readingTime: data.readingTime ? String(data.readingTime).trim() : null,
      cadastralKey: data.cadastralKey ? String(data.cadastralKey).trim() : '',
    };
  }

  static toDomainPending(
    data: PendingReadingSQLResult,
  ): PendingReadingResponse {
    return {
      cardId: data.card_id,
      name: data.name,
      lastName: data.last_name,
      cadastralKey: data.cadastral_key,
      address: data.address,
      rate: data.rate,
      month: data.month,
      year: data.year,
      consumption: data.consumption,
      previousReading: data.previous_reading,
      currentReading: data.current_reading,
      epaaValue: data.epaa_value,
      trashRate: data.trash_rate,
      thirdPartyValue: data.third_party_value,
      total: data.total,
      dueDate: data.due_date,
      incomeStatus: data.income_status,
      monthDue: data.month_due,
      yearDue: data.year_due,
      readingStatus: data.reading_status,
      paymentDate: data.payment_date,
      incomeDate: data.income_date,
    };
  }
}
