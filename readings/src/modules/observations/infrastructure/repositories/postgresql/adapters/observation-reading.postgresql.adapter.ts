import { ObservationReadingResponse } from '../../../../domain/schemas/dto/response/observation-reading.response';
import { ObservationReadingSQLResponse } from '../../../interfaces/sql/observatio-reading.sql.response';

export class ObservationReadingSQLAdapter {
  static toObservationReadingResponse(
    sqlResponse: ObservationReadingSQLResponse,
  ): ObservationReadingResponse {
    return {
      observationReadingId: sqlResponse.observation_reading_id,
      readingId: sqlResponse.reading_id,
      observationId: sqlResponse.observation_id,
      observationTitle: sqlResponse.observation_title,
      observationDetails: sqlResponse.observation_details,
    };
  }
}
