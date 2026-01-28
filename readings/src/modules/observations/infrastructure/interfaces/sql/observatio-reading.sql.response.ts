export interface ObservationReadingSQLResponse {
  observation_reading_id: number;
  reading_id: number;
  observation_id: number;
  observation_title: string;
  observation_details: string;
}

export interface ObservationSQLResult {
  observation_id: number;
  observation_title: string;
  observation_details: string;
}

export interface ObservationReadingSQLResult {
  observation_reading_id: number;
  observation_id: number;
  reading_id: number;
  register_date: string;
}

export interface ObservationDetailsSQLResponse {
  observation_id: number;
  observation_title: string;
  observation_details: string;
  observation_date: string;
  reading_id: number;
  connection_id: number;
  previous_reading: number;
  current_reading: number;
  sector: number;
  account: number;
  cadastral_key: string;
  rental_income_code: number;
  reading_value: number;
  novelty_reading_type_id: number;
  novelty_type_name: string;
  novelty_type_description: string;
  client_id: string;
  address: string;
  client_name: string;
  observations: string;
}
