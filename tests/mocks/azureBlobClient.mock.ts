/* eslint-disable @typescript-eslint/unbound-method */
/*

IMPORTANT!

To be able to use this mock in your test file, remember to add:

jest.mock('PATH/src/azureBlob/azureBlobClient')

*/
import { mock } from 'jest-mock-extended';
import * as AZURE_BLOB from '../../src/azureBlob/azureBlobClient';

const mockedNewAzureBlobClient = jest.mocked(AZURE_BLOB.newAzureBlobClient);

mockedNewAzureBlobClient.mockImplementation(
  (): AZURE_BLOB.AzureBlobClient => mockedAzureBlobClient,
);

export const mockedAzureBlobClient = mock<AZURE_BLOB.AzureBlobClient>();
