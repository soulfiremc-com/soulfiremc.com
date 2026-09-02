import { sessionOptions } from "@better-auth-ui/core";
import { sessionOptionsServer } from "@better-auth-ui/core/server";
import type { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";

const ROUTE_SESSION_STALE_TIME = 30_000;

type RouteSessionInput = {
  queryClient: QueryClient;
};

export const ensureRouteSession = createIsomorphicFn()
  .server(({ queryClient }: RouteSessionInput) =>
    queryClient.ensureQueryData({
      ...sessionOptionsServer(auth, { headers: getRequestHeaders() }),
      staleTime: ROUTE_SESSION_STALE_TIME,
    }),
  )
  .client(({ queryClient }: RouteSessionInput) =>
    queryClient.ensureQueryData({
      ...sessionOptions(authClient),
      staleTime: ROUTE_SESSION_STALE_TIME,
    }),
  );
