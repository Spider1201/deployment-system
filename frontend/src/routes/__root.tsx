import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div style={{ padding: 20 }}>
      <h1>Mini PaaS</h1>
      <Outlet />
    </div>
  )
});