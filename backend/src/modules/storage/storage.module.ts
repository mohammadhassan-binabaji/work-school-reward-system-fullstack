import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService, MinioS3StorageService } from './storage.service';
import { FilesController } from './files.controller';

@Global()
@Module({
  controllers: [FilesController],
  providers: [
    LocalStorageService,
    MinioS3StorageService,
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (
        config: ConfigService,
        local: LocalStorageService,
        minio: MinioS3StorageService,
      ) => {
        const provider = config.get<string>('app.storageProvider') || 'local';
        return provider === 'minio' || provider === 's3' ? minio : local;
      },
      inject: [ConfigService, LocalStorageService, MinioS3StorageService],
    },
  ],
  exports: ['STORAGE_SERVICE', LocalStorageService, MinioS3StorageService],
})
export class StorageModule {}
