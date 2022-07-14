import {
  BlobGetPropertiesResponse,
  BlobServiceClient,
  Metadata,
} from '@azure/storage-blob';
import { AzureBlobError } from './azureBlobError';
import config from '../config';

export class AzureBlobClient {
  constructor(
    public blobServiceClient: BlobServiceClient,
  ) { }

  public async getFileMetadata(containerName: string, fileName: string): Promise<Metadata | undefined> {
    try {
      const propertiesResponse: BlobGetPropertiesResponse = await this.blobServiceClient
        .getContainerClient(containerName)
        .getBlockBlobClient(fileName)
        .getProperties();
      return propertiesResponse.metadata;
    } catch (error) {
      throw new AzureBlobError(
        'Failed to get file metadata',
        error,
        {
          containerName,
          fileName,
        },
      );
    }
  }
}

export const newAzureBlobClient = (): AzureBlobClient => new AzureBlobClient(
  BlobServiceClient.fromConnectionString(config.azureBlob.storageConnectionString),
);
