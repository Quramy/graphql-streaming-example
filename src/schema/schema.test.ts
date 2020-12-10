import { graphql } from 'graphql';
import { schema } from './schema';

async function main() {
  const result = await graphql({
    source: `
      fragment ProductDetail on Product {
        specialPrice
      }
      query ProductsQuery {
        products(first: 3) @stream(initialCount: 1, label: "list") {
          id
          name
          price
          ...ProductDetail @defer(label: "detail")
        }
      }
    `,
    schema,
  });
  if ('next' in result) {
    for await (const chunk of result) {
      if (!('path' in chunk)) {
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
