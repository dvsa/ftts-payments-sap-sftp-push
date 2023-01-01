export const createTraceparent = (originalTraceparent: string | null | undefined, operationId: string): string | null | undefined => {
  if (!originalTraceparent) {
    return originalTraceparent;
  }
  const traces = originalTraceparent.split('-');
  if (traces.length < 4) {
    return originalTraceparent;
  }
  traces[1] = operationId;
  return traces.join('-');
};
