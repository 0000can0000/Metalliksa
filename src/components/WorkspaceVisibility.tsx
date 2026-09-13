import React, { createContext, useContext } from 'react';

const WorkspaceVisibilityContext = createContext(true);

/** Visibility composes across retained modules and their retained workflow stages. */
export function WorkspaceVisibility({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const parentVisible = useWorkspaceVisible();
  return <WorkspaceVisibilityContext.Provider value={parentVisible && visible}>{children}</WorkspaceVisibilityContext.Provider>;
}

/** Suspend visual resources without unmounting their surrounding forms or jobs. */
export function useWorkspaceVisible() {
  return useContext(WorkspaceVisibilityContext);
}
