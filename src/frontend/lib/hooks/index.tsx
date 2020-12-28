import { useContext } from 'react';
import { Path } from '../types';
import { context } from '../providers/graphql-provider';

function useEnvironment() {
  const environment = useContext(context);
  if (!environment) {
    throw new Error('no environment!');
  }
  return environment;
}

export function useQuery<T = any, V = any>({ query, variables }: { query: string; variables: V }) {
  const env = useEnvironment();
  const operationKey = env.getOperationKey({ query, variables });
  const fragmentData = env.readFragment<T>(operationKey, []);
  if (fragmentData) return fragmentData;
  const promise = env.query({ query, variables });
  throw promise;
}

export function useFragment<T = any>(_fragment: string, ref: { operationKey: string; path: Path }) {
  const env = useEnvironment();
  const fragmentData = env.readFragment<T>(ref.operationKey, ref.path);
  if (fragmentData) return fragmentData;
  const promise = env.fragment(_fragment, ref);
  throw promise;
}
