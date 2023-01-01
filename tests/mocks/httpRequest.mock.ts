import { HttpRequest } from '@azure/functions';

export const httpRequest: HttpRequest = {
  method: null,
  url: '',
  headers: {},
  query: {},
  params: {},
  body: null,
  rawBody: null,
};
