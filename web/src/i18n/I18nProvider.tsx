'use client';
import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { GENERAL_SETTINGS_KEY } from '../theme/theme-preference';
import { sourceMessage,interpolateMessage,type MessageParams } from './catalog';
import { localeDirection,normalizeLocaleTag } from './locale';
import { hasShippedTranslation } from './translation-manifest';
type TranslationStatus='source'|'loading'|'translated'|'fallback';
type I18nContextValue={locale:string;status:TranslationStatus;setLocale:(locale:string)=>void;t:(key:string,params?:MessageParams,fallback?:string)=>string;plural:(baseKey:string,count:number,params?:MessageParams,fallback?:string)=>string;hasTranslation:(locale:string)=>boolean;};
type RuntimeManifest={artifacts:Record<string,{path:string}>};
const I18nContext=createContext<I18nContextValue|null>(null),bundleCache=new Map<string,Record<string,string>>();let manifestPromise:Promise<RuntimeManifest|null>|null=null;
function readStoredLocale():string|null{try{const raw=window.localStorage.getItem(GENERAL_SETTINGS_KEY),parsed=raw?JSON.parse(raw) as Record<string,unknown>:{};return typeof parsed.locale==='string'?normalizeLocaleTag(parsed.locale):null;}catch{return null;}}
function saveStoredLocale(locale:string):void{try{const raw=window.localStorage.getItem(GENERAL_SETTINGS_KEY),parsed=raw?JSON.parse(raw) as Record<string,unknown>:{};window.localStorage.setItem(GENERAL_SETTINGS_KEY,JSON.stringify({...parsed,locale}));}catch{window.localStorage.setItem(GENERAL_SETTINGS_KEY,JSON.stringify({locale}));}}
function bundleCandidates(locale:string):string[]{const normalized=normalizeLocaleTag(locale),language=new Intl.Locale(normalized).language.toLowerCase();return[...new Set([normalized.toLowerCase(),language])];}
async function loadManifest():Promise<RuntimeManifest|null>{if(manifestPromise)return manifestPromise;const basePath=process.env.NEXT_PUBLIC_SREADYA_BASE_PATH??'';manifestPromise=fetch(`${basePath}/i18n/manifest.json`,{cache:'force-cache'}).then(async response=>{if(!response.ok)return null;const raw:unknown=await response.json();if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;const artifacts=(raw as{artifacts?:unknown}).artifacts;if(!artifacts||typeof artifacts!=='object'||Array.isArray(artifacts))return null;return{artifacts:artifacts as RuntimeManifest['artifacts']};}).catch(()=>null);return manifestPromise;}
async function loadBundle(locale:string):Promise<Record<string,string>>{const normalized=normalizeLocaleTag(locale);if(normalized.toLowerCase()==='en')return{};const manifest=await loadManifest();if(!manifest)return{};for(const candidate of bundleCandidates(normalized)){const cached=bundleCache.get(candidate);if(cached)return cached;const artifact=manifest.artifacts[candidate];if(!artifact?.path)continue;const basePath=process.env.NEXT_PUBLIC_SREADYA_BASE_PATH??'';try{const response=await fetch(`${basePath}/${artifact.path}`,{cache:'force-cache'});if(!response.ok)continue;const raw:unknown=await response.json();if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;const bundle=Object.fromEntries(Object.entries(raw as Record<string,unknown>).filter((entry):entry is[string,string]=>typeof entry[1]==='string'));bundleCache.set(candidate,bundle);return bundle;}catch{}}return{};}
function applyDocumentLocale(locale:string):void{const normalized=normalizeLocaleTag(locale);document.documentElement.lang=normalized;document.documentElement.dir=localeDirection(normalized);document.documentElement.setAttribute('data-sreadya-locale',normalized);}
export function I18nProvider({children}:{children:ReactNode}){const[locale,setLocaleState]=useState('en'),[messages,setMessages]=useState<Record<string,string>>({}),[status,setTranslationStatus]=useState<TranslationStatus>('source');const requestId=useRef(0);
 const activate=useCallback((nextLocale:string,persist=true)=>{const normalized=normalizeLocaleTag(nextLocale),id=++requestId.current;setLocaleState(normalized);applyDocumentLocale(normalized);if(persist)saveStoredLocale(normalized);if(normalized.toLowerCase()==='en'){setMessages({});setTranslationStatus('source');return;}setTranslationStatus('loading');void loadBundle(normalized).then(bundle=>{if(requestId.current!==id)return;setMessages(bundle);setTranslationStatus(Object.keys(bundle).length>0?'translated':'fallback');});},[]);
 useEffect(()=>{const stored=readStoredLocale(),detected=navigator.languages?.find(Boolean)??navigator.language??'en';activate(stored??detected,false);},[activate]);
 const t=useCallback((key:string,params:MessageParams={},fallback?:string)=>interpolateMessage(messages[key]??sourceMessage(key,fallback),params),[messages]);
 const plural=useCallback((baseKey:string,count:number,params:MessageParams={},fallback?:string)=>{const category=new Intl.PluralRules(locale).select(count),categoryKey=`${baseKey}.${category}`,otherKey=`${baseKey}.other`,template=messages[categoryKey]??messages[otherKey]??sourceMessage(categoryKey,sourceMessage(otherKey,fallback));return interpolateMessage(template,{...params,count});},[locale,messages]);
 const value=useMemo<I18nContextValue>(()=>({locale,status,setLocale:(next)=>activate(next,true),t,plural,hasTranslation:hasShippedTranslation}),[activate,locale,plural,status,t]);return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;}
const sourceOnlyI18n:I18nContextValue={
 locale:'en',
 status:'source',
 setLocale:()=>{},
 t:(key,params={},fallback)=>interpolateMessage(sourceMessage(key,fallback),params),
 plural:(baseKey,count,params={},fallback)=>{
   const category=new Intl.PluralRules('en').select(count);
   const categoryKey=`${baseKey}.${category}`,otherKey=`${baseKey}.other`;
   return interpolateMessage(sourceMessage(categoryKey,sourceMessage(otherKey,fallback)),{...params,count});
 },
 hasTranslation:hasShippedTranslation,
};
export function useI18n():I18nContextValue{return useContext(I18nContext)??sourceOnlyI18n;}
