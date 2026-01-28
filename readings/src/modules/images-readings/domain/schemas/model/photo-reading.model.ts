export class PhotoReadingModel {
  private photoReadingId?: number;
  private readingId: number;
  private photoUrl: string;
  private cadastralKey: string;
  private description?: string;
  private createdAt?: Date;
  private updatedAt?: Date;

  constructor(
    readingId: number,
    photoUrl: string,
    cadastralKey: string,
    description?: string,
    photoReadingId?: number,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.photoReadingId = photoReadingId;
    this.readingId = readingId;
    this.photoUrl = photoUrl;
    this.cadastralKey = cadastralKey;
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public getPhotoReadingId(): number | undefined {
    return this.photoReadingId;
  }

  public getReadingId(): number {
    return this.readingId;
  }

  public getPhotoUrl(): string {
    return this.photoUrl;
  }

  public getCadastralKey(): string {
    return this.cadastralKey;
  }

  public getDescription(): string | undefined {
    return this.description;
  }

  public getCreatedAt(): Date | undefined {
    return this.createdAt;
  }

  public getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  public setDescription(description: string): void {
    this.description = description;
  }

  public setPhotoUrl(photoUrl: string): void {
    this.photoUrl = photoUrl;
  }

  public setUpdatedAt(updatedAt: Date): void {
    this.updatedAt = updatedAt;
  }

  public setCreatedAt(createdAt: Date): void {
    this.createdAt = createdAt;
  }

}
