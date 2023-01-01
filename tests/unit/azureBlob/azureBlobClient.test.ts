import { mock } from 'jest-mock-extended';
import * as AZURE_BLOB from '@azure/storage-blob';
import { AzureBlobClient, newAzureBlobClient } from '../../../src/azureBlob/azureBlobClient';
import { AzureBlobError } from '../../../src/azureBlob/azureBlobError';
import { mockedConfig } from '../../mocks/config.mock';

jest.mock('../../../src/config');
jest.mock('@azure/storage-blob');
const mockedBlobServiceClient = mock<AZURE_BLOB.BlobServiceClient>();
const mockedContainerClient = mock<AZURE_BLOB.ContainerClient>();
const mockedBlockBlobClient = mock<AZURE_BLOB.BlockBlobClient>();

const blobClient = new AzureBlobClient(mockedBlobServiceClient);

const fileName = 'FTTS_20201103000000.dat';
const containerName = 'files';
const operationid = '12345678901234567890123456789012';

describe('AzureBlobClient', () => {
  beforeEach(() => {
    mockedBlobServiceClient.getContainerClient.mockReturnValue(mockedContainerClient);
    mockedContainerClient.getBlockBlobClient.mockReturnValue(mockedBlockBlobClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('newAzureBlobClient', () => {
    test('GIVEN config.azureBlob.storageConnectionString is defined WHEN called THEN AzureBlobClient is created using the connection string', () => {
      mockedConfig.azureBlob.storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=cloud;AccountKey=x+y==;EndpointSuffix=core.windows.net';
      AZURE_BLOB.BlobServiceClient.fromConnectionString = jest.fn().mockReturnValue(mockedBlobServiceClient);

      const azureBlobClientInstance: AzureBlobClient = newAzureBlobClient();

      expect(AZURE_BLOB.BlobServiceClient.fromConnectionString).toHaveBeenCalledTimes(1);
      expect(AZURE_BLOB.BlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
        mockedConfig.azureBlob.storageConnectionString,
      );
      expect(azureBlobClientInstance.blobServiceClient).toBe(mockedBlobServiceClient);
    });
  });

  describe('getFileMetadata', () => {
    test('GIVEN containerName and fileName WHEN metadata exists THEN returns metadata', async () => {
      mockedBlockBlobClient.getProperties.mockResolvedValue({
        metadata: {
          operationid,
        },
      } as unknown as AZURE_BLOB.BlobGetPropertiesResponse);

      const actualMetadata = await blobClient.getFileMetadata(containerName, fileName);

      expect(actualMetadata).toEqual({ operationid });
    });

    test('GIVEN containerName and fileName WHEN no metadataTHEN returns undefined', async () => {
      mockedBlockBlobClient.getProperties.mockResolvedValue({} as unknown as AZURE_BLOB.BlobGetPropertiesResponse);

      const actualMetadata = await blobClient.getFileMetadata(containerName, fileName);

      expect(actualMetadata).toBeUndefined();
    });

    test('GIVEN containerName and fileName WHEN getProperties failed THEN throw AzureBlobError', async () => {
      const getPropertiesError = new Error('msg');
      mockedBlockBlobClient.getProperties.mockRejectedValue(getPropertiesError);

      await expect(blobClient.getFileMetadata(containerName, fileName)).rejects.toThrow(AzureBlobError);
    });
  });
});
