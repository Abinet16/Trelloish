import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const VITE_API_HTTP_URL = 'http://localhost:4000/graphql';
const VITE_API_WS_URL = 'ws://localhost:4000/graphql';

// Create an HTTP link for queries and mutations
const httpLink = createHttpLink({
  uri: VITE_API_HTTP_URL,
});

// Middleware to add the JWT token to the headers of each request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Create a WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: VITE_API_WS_URL,
    connectionParams: () => {
      // You can pass connection parameters here, e.g., the auth token
      const token = localStorage.getItem('accessToken');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
  })
);

// The split function can send data to each link
// depending on what kind of operation is being sent
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink, // If it's a subscription, use the WebSocket link
  authLink.concat(httpLink) // Otherwise, use the HTTP link with the auth header
);

// Create the Apollo Client instance
export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});