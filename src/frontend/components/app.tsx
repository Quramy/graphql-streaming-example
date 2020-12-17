import { Suspense } from 'react';
import { HttpGraphQLClient, GraphQLProvider} from '../lib';
import Products from './products';

const Loading = () => <div>Loading...</div>;

const App = () => {
  const client = new HttpGraphQLClient({ url: '/graphql' });
  return (
    <GraphQLProvider transport={client}>
      <Suspense fallback={<Loading />}>
        <Products />
      </Suspense>
    </GraphQLProvider>
  );
};

export default App;
