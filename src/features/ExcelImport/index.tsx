import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';

const App = lazy(() => import('./IContext'));

export default async function main() {
  await window.JSSDK.shared.setSharedModules({
    React,
    ReactDOM,
  });

  const container = document.createElement('div');
  container.id = 'app';
  document.body.appendChild(container);
  const root = createRoot(container);
  if (window.JSSDK.utils.overwriteThemeForSemiUI) {
    await window.JSSDK.utils.overwriteThemeForSemiUI();
  }
  const ctx = await window.JSSDK.button.getContext();

  root.render(
    <Suspense fallback={null}>
      <App
        spaceId={ctx.spaceId}
        workItemTypeKey={ctx.workObjectId!}
      />
    </Suspense>,
  );
}
