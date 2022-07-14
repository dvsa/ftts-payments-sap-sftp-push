import dns from 'dns';
import sFTPAddressResolver from '../../../src/sftp/SFTPAddressResolver';

jest.mock('dns', () => ({
  promises: {
    setServers: jest.fn(),
    resolve4: jest.fn(),
  },
}));

const setSetserversMock = jest.mocked(dns.promises.setServers, true);
const resolve4Mock = jest.mocked(dns.promises.resolve4, true);

const DNS_SERVER = 'dns_server';
const SFTP_HOST = 'sftp_server';

const address1 = 'ip address 1';
const address2 = 'ip address 2';
const dnsResolveResult = [address1, address2];

describe('SFTPAddressResolver', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('GIVEN input server and host WHEN resolve THEN correct dns request and result', async () => {
    resolve4Mock.mockResolvedValue(dnsResolveResult);

    const result = await sFTPAddressResolver.resolve(DNS_SERVER, SFTP_HOST);

    expect(result).toEqual(address1);
    expect(setSetserversMock).toHaveBeenCalledTimes(1);
    expect(setSetserversMock).toHaveBeenCalledWith([DNS_SERVER]);
    expect(resolve4Mock).toHaveBeenCalledTimes(1);
    expect(resolve4Mock).toHaveBeenCalledWith(SFTP_HOST);
  });

  test('GIVEN input server and host WHEN setServer fails THEN error is thrown', async () => {
    const expectedError = new Error('setServers error');
    setSetserversMock.mockImplementation(() => { throw expectedError; });

    await expect( sFTPAddressResolver.resolve(DNS_SERVER, SFTP_HOST)).rejects.toThrow(expectedError);
    expect(setSetserversMock).toHaveBeenCalledTimes(1);
    expect(resolve4Mock).toHaveBeenCalledTimes(0);

  });

  test('GIVEN input server and host WHEN resolve4 fails THEN error is thrown', async () => {
    const expectedError = new Error('reasolve4 error');
    resolve4Mock.mockImplementation(() => { throw expectedError; });

    await expect( sFTPAddressResolver.resolve(DNS_SERVER, SFTP_HOST)).rejects.toThrow(expectedError);
    expect(setSetserversMock).toHaveBeenCalledTimes(1);
    expect(resolve4Mock).toHaveBeenCalledTimes(1);
  });
});
