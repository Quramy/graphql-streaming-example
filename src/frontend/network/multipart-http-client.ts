import type { ExecutionResult, AsyncExecutionResult } from 'graphql';

const CRLF = '\r\n';
const separator = CRLF + CRLF;
const decoder = new TextDecoder();

export class HttpGraphQLClient {
  readonly url: string;
  constructor({ url } : { url : string }) {
    this.url = url;
  }

  graphql(args: { query: string; variables?: any }) {
    return graphqlHttp(args);
  }
}

async function graphqlHttp({ query, variables }: { query: string; variables?: any }) {
  const headers = new Headers();
  headers.set('Accept', 'application/json, multipart/mixed');
  headers.set('Content-Type', 'application/json');
  const res = await fetch('/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  if (res.headers.get('Content-Type')?.trim().startsWith('multipart/mixed') && res.body) {
    const boundary = /boundary="(.*)"/.exec(res.headers.get('Content-Type') ?? '')?.[1];
    if (boundary) {
      return generateFromMultipartResponse(res.body, boundary) as AsyncIterableIterator<AsyncExecutionResult>;
    }
  }
  return (await res.json()) as ExecutionResult;
}

async function* generateFromMultipartResponse(stream: ReadableStream<Uint8Array>, boundary: string) {
  const dashBoundary = '--' + boundary;
  const reader = stream.getReader();
  let buffer = '';
  let lastIndex = 0;
  let isPreamble = true;

  try {
    let result: ReadableStreamReadResult<Uint8Array>;
    while (!(result = await reader.read()).done) {
      const chunk = decoder.decode(result.value);
      const idxChunk = chunk.indexOf(dashBoundary);
      let idxBoundary = buffer.length;
      buffer += chunk;

      if (idxChunk !== -1) {
        idxBoundary += idxChunk;
      } else {
        idxBoundary = buffer.indexOf(dashBoundary, lastIndex);

        if (idxBoundary === -1) {
          lastIndex = buffer.length - chunk.length;
          continue;
        }
      }

      while (idxBoundary !== -1) {
        const current = buffer.slice(0, idxBoundary);
        const next = buffer.slice(idxBoundary + dashBoundary.length);

        if (isPreamble) {
          isPreamble = false;
        } else {
          const headers: Record<string, string> = {};
          const idxHeaders = current.indexOf(separator);
          const headerLows = buffer.slice(0, idxHeaders).trim().split(CRLF);

          for (const headerLow of headerLows) {
            const [key, ...values] = headerLow!.split(': ') as [string, ...string[]];
            headers[key.toLowerCase()] = values.join(': ');
          }

          let body = current.slice(idxHeaders + separator.length, current.lastIndexOf(CRLF));
          if (headers['content-type']?.includes('application/json')) {
            try {
              body = JSON.parse(body);
            } catch (_) {}
          }

          yield body;
        }

        buffer = next;
        lastIndex = 0;
        idxBoundary = buffer.indexOf(dashBoundary);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
