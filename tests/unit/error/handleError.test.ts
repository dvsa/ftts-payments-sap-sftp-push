import { InternalAccessDeniedError } from '@dvsa/egress-filtering';
import handleError from '../../../src/error/handleError';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { mockedLogger } from '../../mocks/logger.mock';

jest.mock('../../../src/observability/logger');

describe('handleError', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GIVEN an error WHEN called THEN expect the error to have been logged', () => {
    const error = new InternalAccessDeniedError('host', '80', 'error msg');

    expect(() => handleError(error)).toThrow(error);

    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.NOT_WHITELISTED_URL_CALL,
      error.message,
      { host: error.host, port: error.port },
    );
  });
});
