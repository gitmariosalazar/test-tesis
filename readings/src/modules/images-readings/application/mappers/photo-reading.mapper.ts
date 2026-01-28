import { CreatePhotoReadingRequest } from "../../domain/schemas/dto/request/create.photo-reading.request";
import { PhotoReadingResponse } from "../../domain/schemas/dto/response/photo-reading.response";
import { PhotoReadingModel } from "../../domain/schemas/model/photo-reading.model";

export class PhotoReadingMapper {
  static fromCreatePhotoReadingRequestToPhotoReadingModel(photoReadingRequest: CreatePhotoReadingRequest): PhotoReadingModel {
    const photoReadingModel = new PhotoReadingModel(
      photoReadingRequest.readingId,
      photoReadingRequest.photoUrl,
      photoReadingRequest.cadastralKey,
      photoReadingRequest.description
    );
    return photoReadingModel;
  }

  static fromPhotoReadingModelToPhotoReadingResponse(model: PhotoReadingModel): PhotoReadingResponse {
    const response: PhotoReadingResponse = {
      photoReadingId: model.getPhotoReadingId(),
      readingId: model.getReadingId(),
      photoUrl: model.getPhotoUrl(),
      cadastralKey: model.getCadastralKey(),
      description: model.getDescription(),
      createdAt: model.getCreatedAt(),
      updatedAt: model.getUpdatedAt()
    };
    return response;
  }

  static fromPhotoReadingModelsToPhotoReadingResponses(models: PhotoReadingModel[]): PhotoReadingResponse[] {
    return models.map((model) => this.fromPhotoReadingModelToPhotoReadingResponse(model));
  }
}