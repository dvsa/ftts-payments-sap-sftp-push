import { createTraceparent } from '../../../src/observability/createTraceparent';

describe('createTraceparent', () => {
  test.each([
    [
      '00-12345678901234567890123456789012-1234567890123456-11',
      '44444444444444444444444444444444',
      '00-44444444444444444444444444444444-1234567890123456-11',
    ],
    [
      '00-12345678901234567890123456789012-1234567890123456',
      '44444444444444444444444444444444',
      '00-12345678901234567890123456789012-1234567890123456',
    ],
    [
      '00-12345678901234567890123456789012-1234567890123456-11',
      '1',
      '00-1-1234567890123456-11',
    ],
    [
      undefined,
      '1',
      undefined,
    ],
    [
      null,
      '1',
      null,
    ],
  ])('GIVEN originalTraceparent and custom operationId WHEN createtraceparent THEN correct result',
    (
      originalTraceparent,
      operationId,
      expectedResult,
    ) => {
      expect(
        createTraceparent(originalTraceparent, operationId),
      ).toEqual(expectedResult);
    });
});
