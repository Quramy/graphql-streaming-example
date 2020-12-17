import {
  GraphQLNonNull,
  GraphQLList,
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql';

import { products } from './data';
import { ProductItemData } from "./types";

const Product = new GraphQLObjectType({
  name: 'Product',
  fields: {
    id: {
      type: GraphQLNonNull(GraphQLID),
    },
    name: {
      type: GraphQLNonNull(GraphQLString),
    },
    price: {
      type: GraphQLNonNull(GraphQLInt),
    },
    specialPrice: {
      type: GraphQLInt,
      resolve: calcSpecialPrice,
    },
  },
});

const AllProducts = new GraphQLObjectType({
  name: 'AllProducts',
  fields: {
    count: {
      type: GraphQLNonNull(GraphQLInt),
      resolve: () => products.length,
    },
    nodes: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(Product))),
      resolve: () => collectProducts(),
    },
  },
});

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: {
    products: {
      type: GraphQLList(Product),
      args: {
        first: {
          type: GraphQLNonNull(GraphQLInt),
        },
      },
      resolve: (_, args) => collectProducts(args as { first: number }),
    },
    allProducts: {
      type: GraphQLNonNull(AllProducts),
      resolve: () => ({}),
    },
  },
});

/**
 *
 * ```graphql
 * type Product {
 *   id: ID!
 *   name: String!
 *   price: Int!
 *   specialPrice: Int
 * }
 *
 * type AllProducts {
 *   count: Int!
 *   nodes: [Product!]!
 * }
 *
 * type Query {
 *   products(first: Int!): [Product]
 *   allProducts: AllProducts!
 * }
 * ```
 *
 */
export const schema = new GraphQLSchema({
  query: Query,
});

async function* collectProducts({ first } = { first: products.length }) {
  for (const item of products.slice(0, first)) {
    await sleep(300);
    yield item;
  }
}

async function calcSpecialPrice(item: ProductItemData) {
  await sleep(500);
  return ~~(item.price * 0.75);
}

function sleep(interval = 100) {
  return new Promise(res => setTimeout(res, interval));
}
