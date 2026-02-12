export interface ReadingSQLResult {
  sector: number;
  account: number;
  year: number;
  month: string;
  previousReading: number;
  currentReading: number;
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

export interface ReadingSQL2000Result {
  sector: number;
  account: number;
  year: number;
  month: string;
  previousReading: number;
  currentReading: number;
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

export interface TarifaSQLResult {
  Tarifa: string;
}

export interface RangoTarifaSQLResult {
  Minimo: number;
  Maximo: number;
  Base: number;
  Adicional: number;
}

export interface PendingReadingSQLResult {
  // Cliente (solo en la primera fila):
  card_id: string;
  name: string;
  last_name: string;
  // Por cada suministro/planilla:
  cadastral_key: string;
  address: string;
  rate: string;
  month: string;
  year: number;
  consumption: number;
  previous_reading: number;
  current_reading: number;
  epaa_value: number;
  trash_rate: number;
  third_party_value: number;
  total: number;
  due_date: Date | null;
  income_status: string;
  month_due: string;
  year_due: number;
  reading_status: string;
  payment_date: Date | null;
  income_date: Date | null;
}
