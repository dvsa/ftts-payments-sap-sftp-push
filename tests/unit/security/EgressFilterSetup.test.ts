import { InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { logger } from '../../../src/observability/logger';
import { onInternalAccessDeniedError } from '../../../src/security/EgressFilterSetup';

jest.mock('../../../src/config');
jest.mock('@dvsa/egress-filtering');

describe('EgressFilterSetup', () => {
  describe('onInternalAccessDeniedError callback', () => {
    test('logs and rethrows InternalAccessDeniedError', () => {
      const mockError = new InternalAccessDeniedError('host.co.uk', '443', 'Unrecognised address');

      expect(() => onInternalAccessDeniedError(mockError)).toThrow(mockError);
      expect(logger.security).toHaveBeenCalled();
    });
  });
});
