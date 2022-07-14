import { logger } from '../../src/observability/logger';

jest.mock('../../src/observability/logger');

export const mockedLogger = jest.mocked(logger, true);
