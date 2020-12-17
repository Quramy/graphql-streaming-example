import { graphql, useFragment } from '../lib';
import { ProductPrice } from './__generated__/product-price';

export const ProductPriceFragment = graphql`
  fragment ProductPrice on Product {
    specialPrice
  }
`;

const ProductPrice = ({ product }: { product: any }) => {
  const { data } = useFragment<ProductPrice>(ProductPriceFragment, product);
  return (
    <div>
      <span>{data!.specialPrice}</span>
    </div>
  );
};

export default ProductPrice;
