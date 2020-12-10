import { convertToIter } from './convert-to-iter.js';

async function main() {
  const headers = new Headers();
  headers.set('Accept', 'application/json, multipart/mixed');
  headers.set('Content-Type', 'application/json');
  const result = await fetch('/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: `
        fragment ProductDetail on Product {
          specialPrice
        }
        query ProductsQuery {
          products(first: 3) @stream(if: true, initialCount: 1, label: "list") {
            __typename
            id
            name
            price
            ...ProductDetail @defer(if: true, label: "detail")
          }
        }
      `,
    }),
  }).then(convertToIter);
  if ('next' in result) {
    for await (const chunk of result) {
      output(chunk.body as any);
    }
  } else {
    output(await result.json());
  }
}

function output<T extends {}>(data: T) {
  const out = document.getElementById('out')!;
  const preElement = document.createElement('pre');
  preElement.innerText = JSON.stringify(data, null, 2);
  out.appendChild(preElement);
}

main();
