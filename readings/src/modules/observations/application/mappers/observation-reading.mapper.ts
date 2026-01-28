import { CreateObservationReadingRequest } from "../../domain/schemas/dto/request/create-observatio-reading.request";
import { ObservationReadingModel } from "../../domain/schemas/model/observation-reading.model";
import { ObservationModel } from "../../domain/schemas/model/observation.model";

export class ObservationReadingMapper {
  static fromCreateObservationReadingToModel(request: CreateObservationReadingRequest): ObservationReadingModel {
    const observationIdModel = new ObservationModel(0, request.observationTitle, request.observationDetails);
    return new ObservationReadingModel(0, request.readingId, observationIdModel);
  }
}