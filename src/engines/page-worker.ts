import { LuaFactory } from 'wasmoon';
import type { LuaEngine } from 'wasmoon';
import {
  composePage,
  LUA_MODULES,
  pagePanels,
  panelLua,
  validatePageSettings,
} from './page-adapter';
import type { PanelResult } from './page-adapter';
import type { PageRequest, PageResponse } from './page-types';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<PageRequest>) => void) | null;
  postMessage(message: PageResponse): void;
};

let engine: Promise<LuaEngine> | null = null;

async function loadEngine(runtime: PageRequest['runtime']): Promise<LuaEngine> {
  const factory = new LuaFactory(runtime.wasm);
  const sources = await Promise.all(
    LUA_MODULES.map(async (name) => {
      const response = await fetch(new URL(`${name}.lua`, runtime.lua));
      if (!response.ok) throw new Error(`Could not load ${name}.lua (${response.status}).`);
      return response.text();
    }),
  );
  await Promise.all(
    LUA_MODULES.map((name, index) => factory.mountFile(`/florilegium/${name}.lua`, sources[index])),
  );
  const lua = await factory.createEngine();
  await lua.doString('package.path = "/florilegium/?.lua;" .. package.path');
  lua.global.setTop(0);
  return lua;
}

scope.onmessage = async ({ data }) => {
  const { id, settings, runtime } = data;
  try {
    validatePageSettings(settings);
    scope.postMessage({
      id,
      progress: { stage: 'loading', completed: 0, total: 4, label: 'Loading the botanical engine' },
    });
    engine ??= loadEngine(runtime);
    const lua = await engine;
    const started = performance.now();
    const panels = pagePanels(settings);
    const results: PanelResult[] = [];
    for (let index = 0; index < panels.length; index++) {
      const panel = panels[index];
      scope.postMessage({
        id,
        progress: {
          stage: 'growing',
          completed: index,
          total: 4,
          label: `Growing the ${panel.name} margin`,
        },
      });
      try {
        results.push((await lua.doString(panelLua(settings, panel))) as PanelResult);
      } finally {
        // Wasmoon retains returned values on the Lua stack until explicitly cleared.
        lua.global.setTop(0);
        await lua.doString('collectgarbage("collect")');
        lua.global.setTop(0);
      }
    }
    scope.postMessage({
      id,
      result: composePage(settings, panels, results, performance.now() - started),
    });
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
