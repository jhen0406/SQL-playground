/// <reference types="vite/client" />

declare module 'monaco-editor/esm/vs/basic-languages/*';
declare module 'monaco-editor/esm/vs/editor/contrib/*';
declare module 'monaco-editor/esm/vs/editor/editor.worker?worker' {
  const WorkerCtor: { new (): Worker };
  export default WorkerCtor;
}
