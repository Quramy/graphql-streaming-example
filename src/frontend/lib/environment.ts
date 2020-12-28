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

  getOperationKey({ query, variables }: { query: string; variables: any }) {
    return getOperationKey({ query, variables });
  }

  readFragment<T = any>(operationKey: string, path: Path) {
    const fragmentKey = [operationKey, ...path].join('/');
    const patchResult = this.fragmentCache.get(fragmentKey);
    if (patchResult) {
      return { ...(patchResult as ExecutionResult<T>), operationKey: fragmentKey };
    }
  }

  query({ query, variables }: { query: string; variables: any }) {
    const operationKey = getOperationKey({ query, variables });
    const operation = this.operations.get(operationKey) ?? new Operation(this.client, query, variables);
    if (!operation.started) operation.start(() => this.operations.delete(operationKey));
    this.operations.set(operationKey, operation);
    return new Promise<void>(res =>
      operation.once([], queryPayload => {
        this.fragmentCache.set(operationKey, queryPayload);
        res();
      }),
    );
  }

  fragment(_fragment: string, { operationKey, path }: { operationKey: string; path: Path }) {
    const fragmentKey = operationKey + '/' + path.join('/');
    const operation = this.operations.get(operationKey);
    if (!operation) {
      throw new Error('fragment needs operation');
    }
    return new Promise<void>(res => {
      operation.once(path, payload => {
        this.fragmentCache.set(fragmentKey, payload);
        res();
      });
    });
  }
}

type Callback = (payload: AsyncExecutionResult) => void;

function getOperationKey({ query, variables }: { query: string; variables: any }) {
  return query + JSON.stringify(variables);
}

class Operation {
  private _started = false;
  private _completed = false;
  private listeners = new Set<{ pathKey: string; path: Path; cb: Callback }>();
  private payloads = new Map<string, ExecutionResult>();
  constructor(
    private readonly transport: GraphQLTransport,
    private readonly query: string,
    private readonly variables: any,
  ) {}

  get started() {
    return this._started;
  }

  get completed() {
    return this._completed;
  }

  async start(completeCallback: () => void) {
    this._started = true;
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
      this._completed = true;
      completeCallback();
    } else {
      // TODO
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
