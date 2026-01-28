export class ReadingModel {
  private readingId: number;
  private connectionId: string;
  private readingDate: Date | null;
  private readingTime: string | null;
  private sector: number;
  private account: number;
  private cadastralKey: string;
  private readingValue: number | null;
  private sewerRate: number | null;
  private previousReading: number | null;
  private currentReading: number | null;
  private rentalIncomeCode: number | null;
  private novelty: string | null;
  private incomeCode: number | null;
  private tipoNovedadLecturaId: number;
  private currentMonthReading: string;

  public getReadingId(): number {
    return this.readingId;
  }

  public setReadingId(readingId: number): void {
    this.readingId = readingId;
  }

  public getConnectionId(): string {
    return this.connectionId;
  }

  public setConnectionId(connectionId: string): void {
    this.connectionId = connectionId;
  }

  public getReadingDate(): Date | null {
    return this.readingDate;
  }

  public setReadingDate(readingDate: Date): void {
    this.readingDate = readingDate;
  }

  public getReadingTime(): string | null {
    return this.readingTime;
  }

  public setReadingTime(readingTime: string): void {
    this.readingTime = readingTime;
  }

  public getSector(): number {
    return this.sector;
  }

  public setSector(sector: number): void {
    this.sector = sector;
  }

  public getAccount(): number {
    return this.account;
  }

  public setAccount(account: number): void {
    this.account = account;
  }

  public getCadastralKey(): string {
    return this.cadastralKey;
  }

  public setCadastralKey(cadastralKey: string): void {
    this.cadastralKey = cadastralKey;
  }

  public getReadingValue(): number | null {
    return this.readingValue;
  }

  public setReadingValue(readingValue: number): void {
    this.readingValue = readingValue;
  }

  public getSewerRate(): number | null {
    return this.sewerRate;
  }

  public setSewerRate(sewerRate: number): void {
    this.sewerRate = sewerRate;
  }

  public getPreviousReading(): number | null {
    return this.previousReading;
  }

  public setPreviousReading(previousReading: number): void {
    this.previousReading = previousReading;
  }

  public getCurrentReading(): number | null {
    return this.currentReading;
  }

  public setCurrentReading(currentReading: number): void {
    this.currentReading = currentReading;
  }

  public getRentalIncomeCode(): number | null {
    return this.rentalIncomeCode;
  }

  public setRentalIncomeCode(rentalIncomeCode: number): void {
    this.rentalIncomeCode = rentalIncomeCode;
  }

  public getNovelty(): string | null {
    return this.novelty;
  }

  public setNovelty(novelty: string): void {
    this.novelty = novelty;
  }

  public getIncomeCode(): number | null {
    return this.incomeCode;
  }

  public setIncomeCode(incomeCode: number): void {
    this.incomeCode = incomeCode;
  }

  public getTipoNovedadLecturaId(): number {
    return this.tipoNovedadLecturaId;
  }

  public setTipoNovedadLecturaId(tipoNovedadLecturaId: number): void {
    this.tipoNovedadLecturaId = tipoNovedadLecturaId;
  }

  public getCurrentMonthReading(): string {
    return this.currentMonthReading;
  }

  public setCurrentMonthReading(currentMonthReading: string): void {
    this.currentMonthReading = currentMonthReading;
  }
}