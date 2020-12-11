import type { ExecutionResult, AsyncExecutionResult } from 'graphql';

type Part<T> =
  | { json: true; headers: Record<string, string>; body: T }
  | { json: false; headers: Record<string, string>; body: string };

const separator = '\r\n\r\n';
const decoder = new TextDecoder();

export async function graphqlHttp({ query, variables }: { query: string; variables?: any }) {
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
      return generate(res.body, boundary) as AsyncIterableIterator<AsyncExecutionResult>;
    }
  }
  return await res.json() as ExecutionResult;
}

async function* generate<T>(stream: ReadableStream<Uint8Array>, boundary: string): AsyncGenerator<Part<T>> {
  const reader = stream.getReader();
  let buffer = '';
  let lastIndex = 0;
  let isPreamble = true;

  try {
    let result: ReadableStreamReadResult<Uint8Array>;
    outer: while (!(result = await reader.read()).done) {
      const chunk = decoder.decode(result.value);
      const idxChunk = chunk.indexOf(boundary);
      let idxBoundary = buffer.length;
      buffer += chunk;

      if (!!~idxChunk) {
        // chunk itself had `boundary` marker
        idxBoundary += idxChunk;
      } else {
        // search combined (boundary can be across chunks)
        idxBoundary = buffer.indexOf(boundary, lastIndex);

        if (!~idxBoundary) {
          // rewind a bit for next `indexOf`
          lastIndex = buffer.length - chunk.length;
          continue;
        }
      }

      while (!!~idxBoundary) {
        const current = buffer.substring(0, idxBoundary);
        const next = buffer.substring(idxBoundary + boundary.length);

        if (isPreamble) {
          isPreamble = false;
        } else {
          const headers: Record<string, string> = {};
          const idxHeaders = current.indexOf(separator);
          const arrHeaders = buffer.slice(0, idxHeaders).toString().trim().split(/\r\n/);

          // parse headers
          let tmp: string | undefined = undefined;
          while ((tmp = arrHeaders.shift())) {
            const tmp2 = tmp!.split(': ');
            headers[tmp2.shift()!.toLowerCase()] = tmp2.join(': ');
          }

          let body = current.substring(idxHeaders + separator.length, current.lastIndexOf('\r\n'));
          tmp = headers['content-type'];
          if (tmp && !!~tmp.indexOf('application/json')) {
            try {
              body = JSON.parse(body);
            } catch (_) {}
          }

          yield (body as any) as Part<T>;

          if (next.substring(0, 2) === '--') break outer;
        }

        buffer = next;
        lastIndex = 0;
        idxBoundary = buffer.indexOf(boundary);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
