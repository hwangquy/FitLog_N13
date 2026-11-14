import { API_BASE_URL } from '../config/env';
import { createHttpClient } from './http';
import { getAccessToken, setAccessToken } from './session';
const api = createHttpClient({baseUrl:API_BASE_URL,timeoutMs:120000,getToken:getAccessToken,
  onUnauthorized:async requested=>{if((await getAccessToken())===requested)await setAccessToken(null);}});
export type KnowledgeInput = {title:string; category:string; content:string; source:string};
export const adminAiApi = {
  add:async(input:KnowledgeInput)=>(await api.post<{id:string;indexed:boolean}>('/admin/ai/knowledge',input)).data,
  reindex:async()=>(await api.post<{indexedCount:number}>('/admin/ai/knowledge/reindex',{})).data
};
