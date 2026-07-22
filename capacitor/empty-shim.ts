// Stubs server-only modules for the Capacitor SPA build.
// Any named import resolves to a no-op function via a Proxy.
const noop: any = () => undefined;
const handler: ProxyHandler<any> = {
  get: (_t, prop) => {
    if (prop === "__esModule") return true;
    if (prop === "default") return noop;
    return noop;
  },
};
const shim: any = new Proxy(noop, handler);
export default shim;
export const requireSupabaseAuth: any = noop;
export const supabaseAdmin: any = shim;
export const getRequest: any = () => new Request("http://localhost");
export const getStartContext: any = () => ({});
export const runWithStartContext: any = (_c: any, fn: any) => fn();
export const getStartContextServerOnly: any = () => ({});
export const AsyncLocalStorage: any = class {
  getStore() { return undefined; }
  run(_s: any, fn: any) { return fn(); }
};
export { shim as GLOBAL_STORAGE_KEY };
