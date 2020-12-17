import { Suspense } from 'react';
import { graphql, useQuery } from '../lib';
import ProductPrice, { ProductPriceFragment } from './product-price';

import { ProductsQuery, ProductsQueryVariables } from './__generated__/products-query';

const Loading = () => <div>Loading...</div>;

const Products = () => {
  const { data, operationKey } = useQuery<ProductsQuery, ProductsQueryVariables>({
    query: graphql`
      query ProductsQuery($enableStream: Boolean!) {
        allProducts {
          count
          nodes {
            id
            name
            price
            ...ProductPrice @defer(if: $enableStream)
          }
        }
      }

      ${ProductPriceFragment}
    `,
    variables: {
      enableStream: true,
    },
  });
  if (!data) return null;
  const {
    allProducts: { nodes },
  } = data;
  return (
    <ul>
      {nodes.map((node, i) => (
        <li key={node.id}>
          {node.name}
          <Suspense fallback={<Loading />}>
            <ProductPrice product={{ ...node, operationKey, path: ['allProducts', 'nodes', i] }} />
          </Suspense>
        </li>
      ))}
    </ul>
  );
};

export default Products;
