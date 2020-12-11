import { graphql, AsyncExecutionResult, ExecutionPatchResult } from 'graphql';
import { schema } from './schema';

function isAsyncIterable(x: any): x is AsyncIterableIterator<any> {
  return x != null && typeof x === 'object' && x[Symbol.asyncIterator];
}

function isPatch(x: AsyncExecutionResult): x is ExecutionPatchResult {
  return 'path' in x && Array.isArray(x.path);
}

async function main() {
  const result = await graphql({
    source: `
      query ProductsQuery {
        products(first: 4) @stream(initialCount: 1, label: "stream") {
          id
          name
          price
          ... on Product @defer(label: "specialPrice") {
            specialPrice
          }
        }
      }
    `,
    schema,
  });
  if (isAsyncIterable(result)) {
    for await (const payload of result) {
      if (!isPatch(payload)) {
        console.log(payload.data, payload.hasNext);
      } else {
        console.log(payload.path, payload.label, payload.data, payload.hasNext);
      }
    }
  } else {
    console.log(result.data);
  }
}

main();
