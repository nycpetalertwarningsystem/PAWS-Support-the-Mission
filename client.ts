import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './routers';

export const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "https://api.petalertwarningsys.com/api/trpc",
      headers() {
        return {
          // Encrypted session token tracking to satisfy HIPAA-aligned auditing constraints
          Authorization: localStorage.getItem('paws_session_token') || '',
        };
      },
    }),
  ],
});
