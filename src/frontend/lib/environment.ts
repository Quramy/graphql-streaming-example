import type { ExecutionResult, AsyncExecutionResult, ExecutionPatchResult } from 'graphql';
import { GraphQLTransport, Path } from './types';

function isAsyncIterable(x: any): x is AsyncIterableIterator<any> {
  return x != null && typeof x === 'object' && x[Symbol.asyncIterator];
}

function isPatch(x: AsyncExecutionResult): x is ExecutionPatchResult {
  return 'path' in x && Array.isArray(x.path);
}

export class Environment {
  private fragmentCache = new Map<string, ExecutionResult>();
  private operations = new Map<string, Operation>();

  constructor(public readonly client: GraphQLTransport) {}

  query<T = any, V = any>({ query, variables }: { query: string; variables: V }) {
    const operation = new Operation(this.client, query, variables);
    const operationKey = operation.id;
    operation.start();
    if (this.fragmentCache.has(operationKey)) {
      return { ...(this.fragmentCache.get(operationKey)! as ExecutionResult<T, {}>), operationKey };
    }
    this.operations.set(operationKey, operation);
    throw new Promise<void>(res =>
      operation.once([], queryPayload => {
        this.fragmentCache.set(operation.id, queryPayload);
        res();
      }),
    );
  }

  fragment<T = any>(_fragment: string, { operationKey, path }: { operationKey: string; path: Path }) {
    const operation = this.operations.get(operationKey);
    if (!operation) {
      throw new Error('fragment needs operation');
    }

    const fragmentKey = operationKey + '/' + path.join('/');
    const patchResult = this.fragmentCache.get(fragmentKey);
    if (!patchResult) {
      throw new Promise<void>(res => {
        operation.once(path, payload => {
          this.fragmentCache.set(fragmentKey, payload);
          res();
        });
      });
    }
    return { ...(patchResult as ExecutionResult<T>), operationKey: fragmentKey };
  }
}

type Callback = (payload: AsyncExecutionResult) => void;

class Operation {
  private listeners = new Set<{ pathKey: string; path: Path; cb: Callback }>();
  private payloads = new Map<string, ExecutionResult>();
  constructor(
    private readonly transport: GraphQLTransport,
    private readonly query: string,
    private readonly variables: any,
  ) {}

  get id() {
    return this.query + JSON.stringify(this.variables);
  }

  async start() {
    const result = await this.transport.graphql({ query: this.query, variables: this.variables });
    if (isAsyncIterable(result)) {
      for await (const payload of result) {
        const path = isPatch(payload) ? payload.path! : ([] as Path);
        const pathKey = path.join('/');
        for (const listener of this.listeners) {
          if (listener.pathKey === pathKey) {
            listener.cb(payload);
          }
        }
        this.payloads.set(pathKey, payload);
      }
    }
  }
  addListener(path: Path, cb: Callback) {
    const pathKey = path.join('/');
    const listner = { pathKey, path, cb };
    this.listeners.add(listner);
    return () => this.listeners.delete(listner);
  }
  removeListener(path: Path, cb: Callback) {
    const pathKey = path.join('/');
    let found: any = null;
    for (const l of this.listeners) {
      if (l.pathKey === pathKey && l.cb === cb) {
        found = l;
        break;
      }
    }
    if (found) this.listeners.delete(found);
  }
  once(path: Path, cb: Callback) {
    const pathKey = path.join('/');
    const p = this.payloads.get(pathKey);
    if (p) {
      cb(p);
      return;
    }
    const wrap: typeof cb = p => {
      cb(p);
      this.removeListener(path, wrap);
    };
    this.addListener(path, wrap);
  }
}
