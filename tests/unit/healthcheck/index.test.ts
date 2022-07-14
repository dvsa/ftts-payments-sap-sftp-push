import { HttpRequest, AzureFunction, Context } from '@azure/functions';
import { httpTriggerContextWrapper } from '@dvsa/azure-logger';
import { Role, withRolesValidation, resolveBooleanConfig } from '@dvsa/ftts-role-validation';
import { index } from '../../../src/healthcheck';
import { mockedContext } from '../../mocks/context.mock';

jest.mock('@dvsa/ftts-role-validation');
jest.mock('@dvsa/azure-logger');
jest.mock('../../../src/observability/logger');

jest.mocked(httpTriggerContextWrapper).mockImplementation(
  async (fn: AzureFunction, context: Context) => fn(context),
);

jest.mocked(withRolesValidation).mockImplementation(
  (fn: AzureFunction) => (context: Context): Promise<any> | void => fn(context),
);

const mockedResolveBooleanConfig = jest.mocked(resolveBooleanConfig);

describe('index', () => {
  const mockedRequest = {} as HttpRequest;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('withRolesValidation', () => {
    test('WHEN called THEN the call is then wrapped into withRolesValidation', async () => {
      await index(mockedContext, {} as HttpRequest);

      expect(withRolesValidation).toHaveBeenCalledTimes(1);
      expect(withRolesValidation).toHaveBeenCalledWith(
        expect.any(Function),
        mockedResolveBooleanConfig('any'),
        [Role.OPERATIONS_HEALTHCHECK_READ],
        expect.any(Function),
      );
    });
  });

  describe('GIVEN httpTrigger', () => {
    test('WHEN called THEN the call is first wrapped into httpTriggerContextWrapper', async () => {
      await index(mockedContext, mockedRequest);

      expect(httpTriggerContextWrapper).toHaveBeenCalledTimes(1);
      expect(httpTriggerContextWrapper).toHaveBeenCalledWith(
        expect.any(Function),
        mockedContext,
        mockedRequest,
      );
    });
  });
});
