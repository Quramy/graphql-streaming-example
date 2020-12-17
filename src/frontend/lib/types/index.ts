import type { graphql } from 'graphql';

export type Path = ReadonlyArray<number | string>;

export interface GraphQLTransport {
  graphql(args: { query: string, variables?: any }): ReturnType<typeof graphql>;
}
