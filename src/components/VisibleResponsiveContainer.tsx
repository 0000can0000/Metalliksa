import React from 'react';
import { ResponsiveContainer as RechartsResponsiveContainer } from 'recharts';
import { useWorkspaceVisible } from './WorkspaceVisibility';

/** Hidden retained workspaces have no layout box for Recharts to measure. */
export function ResponsiveContainer(props: React.ComponentProps<typeof RechartsResponsiveContainer>) {
  const visible = useWorkspaceVisible();
  return visible ? <RechartsResponsiveContainer {...props} /> : null;
}
