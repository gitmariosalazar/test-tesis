export interface ReadingResponse {
  sector: number;
  account: number;
  year: number;
  month: string;
  previousReading: number;
  currentReading: number | null;
  rentalIncomeCode: number | null;
  novelty: string | null;
  readingValue: number | null;
  sewerRate: number | null;
  reconnection: number | null;
  incomeCode: number | null;
  readingDate: Date;
  readingTime: string | null;
  cadastralKey: string;
}

export interface PendingReadingResponse {
  // Cliente (solo en la primera fila):
  cardId: string;
  name: string;
  lastName: string;
  // Por cada suministro/planilla:
  cadastralKey: string;
  address: string;
  rate: string;
  month: string;
  year: number;
  consumption: number;
  previousReading: number;
  currentReading: number;
  epaaValue: number;
  trashRate: number;
  thirdPartyValue: number;
  total: number;
  dueDate: Date | null;
  incomeStatus: string;
  monthDue: string;
  yearDue: number;
  readingStatus: string;
  paymentDate: Date | null;
  incomeDate: Date | null;
}
