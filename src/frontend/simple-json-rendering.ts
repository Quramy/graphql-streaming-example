import type { AsyncExecutionResult, ExecutionPatchResult } from "graphql";
import { HttpGraphQLClient } from './lib/network/multipart-http-client';

function isAsyncIterable(x: any): x is AsyncIterableIterator<any> {
  return x != null && typeof x === 'object' && x[Symbol.asyncIterator];
}

function isPatch(x: AsyncExecutionResult): x is ExecutionPatchResult{
  return 'path' in x && Array.isArray(x.path);
}

type Path = readonly (string | number)[];

function patchData(base: any, path: Path, patch: any) {
  if (path.length === 0) return base;
  let parent = base;
  const fragments = path.slice(0, path.length - 1);
  const lastIndex = path[path.length - 1]!;
  for (const fragment of fragments) {
    parent = parent[fragment];
  }
  const target = parent[lastIndex];
  parent[lastIndex] = { ...target, ...patch };
  return base;
}

async function* graphql({ query, variables }: { query: string; variables?: any }) {
  const client = new HttpGraphQLClient({ url: '/graphql'});
  const result = await client.graphql({ query, variables });
  if (isAsyncIterable(result)) {
    let data: any = {};
    for await (const payload of result) {
      console.log(payload);
      if (!isPatch(payload)) {
        data = payload.data;
      } else {
        data = patchData(data, payload.path!, payload.data);
      }
      yield data;
    }
  } else {
    console.log(result);
    yield result;
  }
}

async function main(enableStream = true) {
  document.querySelector('#out > pre')?.remove();
  const query = `
    fragment ProductDetail on Product {
      specialPrice
    }
    query ProductsQuery($enableStream: Boolean!) {
      products(first: 4) @stream(initialCount: 1, if: $enableStream) {
        id
        name
        price
        ...ProductDetail @defer(if: $enableStream)
      }
    }
  `;
  for await (const queryResult of graphql({ query, variables: { enableStream } })) {
    render(queryResult);
  }
}

function render<T extends {}>(data: T) {
  const out = document.getElementById('out')!;
  const preElement = (out.firstChild as HTMLPreElement) ?? document.createElement('pre');
  out.appendChild(preElement);
  preElement.innerText = JSON.stringify(data, null, 2);
}

for (const elm of document.querySelectorAll('.fetch-btn')) {
  elm.addEventListener('click', () => main((elm as HTMLButtonElement).dataset['streamEnabled'] === 'true'));
}

main();
