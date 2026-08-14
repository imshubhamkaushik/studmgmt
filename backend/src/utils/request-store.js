import { AsyncLocalStorage } from "node:async_hooks";
export const requestStore=new AsyncLocalStorage();
export const getRequestActor=()=>requestStore.getStore()?.actor||null;
export const setRequestActor=(actor)=>{const store=requestStore.getStore();if(store)store.actor=actor;};
