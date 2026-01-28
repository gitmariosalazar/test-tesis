import { PhotoReadingResponse } from '../../../../domain/schemas/dto/response/photo-reading.response';
import { PhotoReadingSQLResponse } from '../../../interfaces/sql/photo-reading.sql.response';

export class PhotoReadingAdapter {
  static fromPhotoReadingResponseToSQL(
    photoReading: PhotoReadingResponse,
  ): PhotoReadingSQLResponse {
    return {
      photo_reading_id: photoReading.photoReadingId,
      reading_id: photoReading.readingId,
      photo_url: photoReading.photoUrl,
      cadastral_key: photoReading.cadastralKey,
      description: photoReading.description,
      created_at: photoReading.createdAt,
      updated_at: photoReading.updatedAt,
    };
  }

  static fromPhotoReadingSQLResponseToPhotoReadingResponse(
    photoReading: PhotoReadingSQLResponse,
  ): PhotoReadingResponse {
    return {
      photoReadingId: photoReading.photo_reading_id,
      readingId: photoReading.reading_id,
      photoUrl: photoReading.photo_url,
      cadastralKey: photoReading.cadastral_key,
      description: photoReading.description,
      createdAt: photoReading.created_at,
      updatedAt: photoReading.updated_at,
    };
  }
}
