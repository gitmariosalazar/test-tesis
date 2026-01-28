export class CreatePhotoReadingRequest {
  readingId: number;
  photoUrl: string;
  cadastralKey: string;
  description?: string;

  constructor(
    readingId: number,
    photoUrl: string,
    cadastralKey: string,
    description?: string
  ) {
    this.readingId = readingId;
    this.photoUrl = photoUrl;
    this.cadastralKey = cadastralKey;
    this.description = description;
  }
}