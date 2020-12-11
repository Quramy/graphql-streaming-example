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
 * type Query {
 *   products(first: Int!): [Product]
 * }
 * ```
 *
 */
export const schema = new GraphQLSchema({
  query: Query,
});

async function* collectProducts({ first } : { first: number } ) {
  for (const item of products.slice(0, first)) {
    yield item;
    await sleep(300);
  }
}

async function calcSpecialPrice(item: ProductItemData) {
  await sleep(500);
  return ~~(item.price * 0.75);
}

function sleep(interval = 100) {
  return new Promise(res => setTimeout(res, interval));
}
