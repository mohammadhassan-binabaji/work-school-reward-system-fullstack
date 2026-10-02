import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface StorageService {
  uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
  getFile(fileKey: string): Promise<Buffer>;
}

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly uploadDir: string;
  private readonly logger = new Logger(LocalStorageService.name);

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, _mimeType?: string): Promise<string> {
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(this.uploadDir, safeName);
    await fs.promises.writeFile(filePath, fileBuffer);
    return `/uploads/${safeName}`;
  }

  async getFile(fileKey: string): Promise<Buffer> {
    const cleanKey = fileKey.replace(/^\/uploads\//, '');
    const filePath = path.join(this.uploadDir, cleanKey);
    return fs.promises.readFile(filePath);
  }
}

@Injectable()
export class MinioS3StorageService implements StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private readonly logger = new Logger(MinioS3StorageService.name);

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('app.minioEndpoint') || 'localhost';
    const port = this.configService.get<number>('app.minioPort') || 9000;
    const useSsl = this.configService.get<boolean>('app.minioUseSsl') || false;
    const accessKeyId = this.configService.get<string>('app.minioAccessKey') || 'minioadmin';
    const secretAccessKey =
      this.configService.get<string>('app.minioSecretKey') || 'minioadminpassword';
    this.bucket = this.configService.get<string>('app.minioBucket') || 'student-rewards';

    const protocol = useSsl ? 'https' : 'http';
    this.s3Client = new S3Client({
      endpoint: `${protocol}://${endpoint}:${port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeName,
        Body: fileBuffer,
        ContentType: mimeType,
      }),
    );
    return `/${this.bucket}/${safeName}`;
  }

  async getFile(fileKey: string): Promise<Buffer> {
    const cleanKey = fileKey.replace(new RegExp(`^/${this.bucket}/`), '');
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      }),
    );
    const byteArray = await response.Body?.transformToByteArray();
    return Buffer.from(byteArray || []);
  }
}
