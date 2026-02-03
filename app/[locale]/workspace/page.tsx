'use client';

import { Suspense } from 'react';
import { WorkspacePageContent } from './WorkspaceContent';

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <WorkspacePageContent />
    </Suspense>
  );
}
