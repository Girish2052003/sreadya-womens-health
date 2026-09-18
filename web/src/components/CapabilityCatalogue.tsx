'use client';
import Link from 'next/link';
import { useMemo,useState } from 'react';
import catalog from '../content/capabilities.generated.json';
import { useI18n } from '../i18n/I18nProvider';
type LaunchCapability=(typeof catalog.launch)[number];
export function CapabilityCatalogue(){
 const {t}=useI18n();const[query,setQuery]=useState(''),normalized=query.trim().toLowerCase();
 const familyName=(prefix:string,fallback:string)=>t(`capability.family.${prefix}`,{},fallback);
 const itemName=(id:string,fallback:string)=>t(`capability.${id}.name`,{},fallback);
 const surfaceLabel=(value:LaunchCapability['surface_type'])=>value==='interaction'?t('catalogue.surface.interaction'):value==='protection'?t('catalogue.surface.protection'):value==='platform-adapted'?t('catalogue.surface.platform-adapted'):value==='provider-dependent'?t('catalogue.surface.provider-dependent'):t('catalogue.surface.status');
 const groups=useMemo(()=>{const filtered=catalog.launch.filter(item=>!normalized||item.id.toLowerCase().includes(normalized)||item.name.toLowerCase().includes(normalized)||(catalog.families.find(f=>f.prefix===item.family)?.name??item.family).toLowerCase().includes(normalized));return catalog.families.map(f=>({...f,items:filtered.filter(item=>item.family===f.prefix)})).filter(f=>f.items.length>0);},[normalized]);
 const count=groups.reduce((sum,f)=>sum+f.items.length,0);
 return <section className="capability-catalogue" aria-labelledby="capability-catalogue-title"><p className="public-eyebrow">{t('catalogue.eyebrow')}</p><h2 id="capability-catalogue-title">{t('catalogue.title')}</h2><p className="public-lede">{t('catalogue.lede')}</p>
 <div className="capability-catalogue__summary"><article><strong>258</strong><span>{t('catalogue.requirements')}</span></article><article><strong>18</strong><span>{t('catalogue.families')}</span></article><article><strong>11</strong><span>{t('catalogue.futureCount')}</span></article></div>
 <label className="core-field"><span>{t('catalogue.search')}</span><input type="search" value={query} onChange={e=>setQuery(e.currentTarget.value)} placeholder={t('catalogue.searchHint')}/></label><div aria-live="polite" className="workspace-note">{t('catalogue.showing',{count})}</div>
 {groups.map((family,index)=><details key={family.prefix} open={Boolean(normalized)||index<2}><summary>{familyName(family.prefix,family.name)} · {family.items.length}</summary><ul className="capability-catalogue__list">{family.items.map(item=><li className="capability-catalogue__item" key={item.id} data-capability-id={item.id}><span className="capability-catalogue__id">{item.id}</span><span><strong>{itemName(item.id,item.name)}</strong><br/><small>{item.web_applicability==='na'?t('catalogue.nativeOnly'):surfaceLabel(item.surface_type)}</small></span><Link href={item.route}>{surfaceLabel(item.surface_type)} →</Link></li>)}</ul></details>)}
 <div className="capability-catalogue__future"><h3>{t('catalogue.futureTitle')}</h3><p>{t('catalogue.futureBody')}</p><ul>{catalog.future.map(item=><li key={item.id}><strong>{item.id}</strong> · {itemName(item.id,item.name)}</li>)}</ul></div></section>;
}
