import { createContext, ReactNode } from 'react';
import { Environment } from '../environment';
import { GraphQLTransport } from '../types';

export const context = createContext<Environment | null>(null);
export const GraphQLProvider = ({ transport, children }: { transport: GraphQLTransport; children: ReactNode }) => {
  const environment = new Environment(transport);
  return <context.Provider value={environment}>{children}</context.Provider>;
};
