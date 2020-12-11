import { graphql, AsyncExecutionResult, ExecutionPatchResult } from 'graphql';
import { schema } from './schema';

function isAsyncIterable(x: any): x is AsyncIterableIterator<any> {
  return x != null && typeof x === 'object' && x[Symbol.asyncIterator];
}

function isPatch(x: AsyncExecutionResult): x is ExecutionPatchResult{
  return 'label' in x && typeof x['label'] === 'string';
}

async function main() {
  const result = await graphql({
    source: `
      fragment ProductDetail on Product {
        specialPrice
      }
      query ProductsQuery {
        products(first: 4) @stream(initialCount: 1, label: "list") {
          id
          name
          price
          ...ProductDetail @defer(label: "detail")
        }
      }
    `,
    schema,
  });
  if (isAsyncIterable(result)) {
    for await (const chunk of result) {
      if (!isPatch(chunk)) {
        console.log(chunk.data);
      } else {
        console.log(chunk.label, chunk.path, chunk.data);
      }
    }
  } else {
    console.log(result.data);
  }
}

main();
