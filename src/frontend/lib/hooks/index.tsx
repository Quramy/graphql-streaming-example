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
  return env.query<T, V>({ query, variables });
}

export function useFragment<T = any>(_fragment: string, ref: { operationKey: string; path: Path }) {
  const env = useEnvironment();
  return env.fragment<T>(_fragment, ref);
}
