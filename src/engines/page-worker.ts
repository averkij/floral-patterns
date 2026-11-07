import { LuaFactory } from 'wasmoon';
import type { LuaEngine } from 'wasmoon';
import { composeContinuousPage, continuousPageLua, LUA_MODULES, validatePageSettings } from './page-adapter';
import type { ContinuousResult } from './page-adapter';
import { adaptGrowSource } from './page-lua';
import type { PageRequest, PageResponse } from './page-types';
import { embeddedTextFont } from '../text-fonts';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<PageRequest>) => void) | null;
  postMessage(message: PageResponse): void;
};
let engine: Promise<LuaEngine> | null = null;

async function loadEngine(runtime: PageRequest['runtime']): Promise<LuaEngine> {
  const factory = new LuaFactory(runtime.wasm);
  const sources = await Promise.all(LUA_MODULES.map(async name => {
    const response = await fetch(new URL(`${name}.lua`, runtime.lua));
    if (!response.ok) throw new Error(`Could not load ${name}.lua (${response.status}).`);
    const source = await response.text();
    return name === 'florilegium-grow' ? adaptGrowSource(source) : source;
  }));
  await Promise.all(LUA_MODULES.map((name, i) => factory.mountFile(`/florilegium/${name}.lua`, sources[i])));
  const lua = await factory.createEngine();
  await lua.doString('package.path = "/florilegium/?.lua;" .. package.path');
  lua.global.setTop(0);
  return lua;
}

scope.onmessage = async ({ data }) => {
  const { id, settings, runtime, animate } = data;
  let lua: LuaEngine | undefined;
  try {
    validatePageSettings(settings);
    scope.postMessage({ id, progress: { stage: 'loading', completed: 0, total: 1, label: 'Loading the botanical engine' } });
    engine ??= loadEngine(runtime);
    const [loaded, fontCss] = await Promise.all([engine, settings.text?.trim() && settings.textFont && runtime.fonts
      ? embeddedTextFont(settings.textFont, runtime.fonts) : Promise.resolve('')]);
    lua = loaded;
    scope.postMessage({ id, progress: { stage: 'growing', completed: 0, total: 1, label: 'Composing one continuous garden' } });
    const started = performance.now();
    const raw = await lua.doString(continuousPageLua(settings)) as ContinuousResult;
    lua.global.setTop(0);
    scope.postMessage({ id, result: composeContinuousPage(settings, raw, performance.now() - started, animate, fontCss) });
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  } finally {
    if (lua) {
      lua.global.setTop(0);
      await lua.doString('collectgarbage("collect")');
      lua.global.setTop(0);
    }
  }
};
