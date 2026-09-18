'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useI18n } from '../../i18n/I18nProvider';
import { DexieSyncQueuePersistence,SyncQueue } from '../../sync/queue';
function baseUrl():string{return(process.env.NEXT_PUBLIC_SREADYA_SYNC_BASE_URL??'').replace(/\/$/,'');}
export function SyncWorkspace(){
 const {t}=useI18n();const endpoint=useMemo(baseUrl,[]),queueRef=useRef<SyncQueue|null>(null);const[pending,setPending]=useState(0),[cursor,setCursor]=useState(''),[paused,setPaused]=useState(false),[status,setStatus]=useState(()=>t('sync.reading'));
 const refresh=async(q:SyncQueue)=>{setPending((await q.listPending()).length);setCursor(await q.getCursor());setPaused(await q.isPaused());};
 useEffect(()=>{const q=new SyncQueue(new DexieSyncQueuePersistence());queueRef.current=q;void refresh(q).then(()=>setStatus(t('sync.ready'))).catch(()=>setStatus(t('sync.unavailable')));return()=>{queueRef.current=null;};},[t]);
 const run=async(action:'pause'|'resume'|'disable')=>{const q=queueRef.current;if(!q)return;if(action==='pause')await q.pause();if(action==='resume')await q.resume();if(action==='disable')await q.disable();await refresh(q);setStatus(action==='pause'?t('sync.paused'):action==='resume'?t('sync.resumed'):t('sync.disabled'));};
 return <div className="workspace-grid"><Card eyebrow={t('sync.eyebrow')} title={t('sync.title')}><div className="continuity-state"><strong>{t('sync.endpoint')}</strong>{endpoint?t('sync.configured'):t('sync.notConfigured')}</div><div className="continuity-state"><strong>{t('sync.localQueue')}</strong>{t('sync.queueState',{pending,state:paused?t('sync.state.paused'):t('sync.state.active')})}</div><div className="continuity-state"><strong>{t('sync.cursor')}</strong>{cursor||t('sync.noCursor')}</div><p role="status">{status}</p></Card><Card eyebrow={t('sync.controlsEyebrow')} title={t('sync.controlsTitle')}><p>{t('sync.controlsBody')}</p><div className="continuity-actions"><Button variant="secondary" onClick={()=>{void run('pause');}}>{t('sync.pause')}</Button><Button variant="secondary" onClick={()=>{void run('resume');}}>{t('sync.resume')}</Button><Button variant="quiet" onClick={()=>{void run('disable');}}>{t('sync.disable')}</Button></div>{!endpoint?<p className="workspace-note">{t('sync.boundary')}</p>:null}</Card></div>;
}
