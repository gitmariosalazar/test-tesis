export interface PhotoReadingSQLResponse {
  photo_reading_id?: number;
  reading_id: number;
  photo_url: string;
  cadastral_key: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}
