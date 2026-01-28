export interface ReadingBasicInfoSQLResult {
  reading_id: number;
  previous_reading_date: Date | null;
  cadastral_key: string;
  card_id: string;
  client_name: string;
  address: string;
  previous_reading: number;
  current_reading: number | null;
  sector: number;
  account: number;
  reading_value: number;
  average_consumption: number;
  meter_number: string;
  rate_id: number;
  rate_name: string;
}

export interface ReadingSQLResult {
  reading_id: number;
  connection_id: string;
  reading_date: Date | null;
  reading_time: string | null;
  sector: number;
  account: number;
  cadastral_key: string;
  reading_value: number | null;
  sewer_rate: number | null;
  previous_reading: number | null;
  current_reading: number | null;
  rental_income_code: number | null;
  novelty: string | null;
  income_code: number | null;
  average_consumption: number;
}

export interface ClientPhoneSQLResult {
  telefono_id: number;
  numero: string;
}

export interface ClientEmailSQLResult {
  email_id: number;
  email: string;
}

export interface ReadingInfoSQLResult {
  reading_id: number;
  previous_reading_date: Date | null;
  reading_time: Date | null;
  cadastral_key: string;
  card_id: string;
  client_name: string;
  client_phones: ClientPhoneSQLResult[];
  client_emails: ClientEmailSQLResult[];
  address: string;
  previous_reading: number;
  current_reading: number | null;
  sector: number;
  account: number;
  reading_value: number;
  average_consumption: number;
  meter_number: string;
  rate_id: number;
  rate_name: string;
  has_current_reading: boolean;
  month_reading: string;
  start_date_period: Date;
  end_date_period: Date;
}
