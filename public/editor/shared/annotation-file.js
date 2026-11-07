import {decodeAsset,encodeAsset} from './pack-meta.js';
import { validAnnotationState, EDGE_CELLS } from './wang-annotations.js';
import { validateWang } from './wang.js';
import { rememberOfflineManifest } from './offline.js';
const handles=new Map();
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function updatedAnnotationManifest(manifest,terrain,base,state){
  if(manifest.id!==terrain.packManifest.id)throw new Error('Selecciona el pack.json del paquete de recursos actual');
  const next=structuredClone(manifest),entry=next.terrains?.find(t=>t.name===terrain.packTerrainName&&t.connect==='wang');
  if(!entry)throw new Error('No se encontró el atlas Wang actual en el archivo');
  if(canonical(entry.wang)!==canonical(base))throw new Error('Las anotaciones del archivo fueron modificadas por otra operación. Vuelve a empaquetar y abre el editor; el borrador actual se conserva.');
  if(!validAnnotationState(state,entry.wang))throw new Error('Datos de anotación no válidos');
  entry.wang={...entry.wang,labels:[...state.labels],labelColors:{...state.colors},boundary:state.boundary,
    tiles:entry.wang.tiles.map((tile,i)=>({...tile,annotations:[...state.cells[i]],edges:EDGE_CELLS.map(p=>state.cells[i][p]??state.boundary)}))};
  validateWang(entry);return {manifest:next,wang:entry.wang};
}
export function updatedAnnotationMeta(document,terrain,base,state){
  const path=terrain.metaPath;
  const header={id:terrain.packManifest.id,version:terrain.packManifest.metaVersion??1};
  const decoded=decodeAsset(header,path,document);
  if(decoded.uuid!==terrain.uuid||decoded.name!==terrain.packTerrainName||decoded.tiles!==terrain.tiles)throw Error('Selecciona el archivo del atlas actual: '+path.split('/').pop());
  const current=structuredClone(terrain.packManifest),index=current.terrains.findIndex(e=>e.name===terrain.packTerrainName);
  if(index<0)throw Error('No se encontró el atlas Wang actual en el archivo');
  current.terrains[index]=decoded;
  const result=updatedAnnotationManifest(current,terrain,base,state);
  return {...result,document:header.version===2?encodeAsset(header,path,{...decoded,wang:result.wang}):{...document,data:{...document.data,wang:result.wang}}};
}
export async function saveAnnotationFile(terrain,base,state){
  const folder=terrain.packFolder,path=terrain.metaPath,key=folder+'/'+(path??'pack.json'),filename=path?.split('/').pop()??'pack.json';
  const update=document=>path?updatedAnnotationMeta(document,terrain,base,state):{...updatedAnnotationManifest(document,terrain,base,state),document:null};
  const initial=()=>{
    if(!path)return terrain.packManifest;
    const {metaPath,...data}=terrain.packManifest.terrains.find(t=>t.name===terrain.packTerrainName);
    if(terrain.packManifest.metaVersion===2)return encodeAsset(terrain.packManifest,path,data);
    return {format:'tilemap-asset',version:1,pack:terrain.packManifest.id,kind:'terrain',data};
  };
  if(!globalThis.showOpenFilePicker){
    const result=update(initial());
    const url=URL.createObjectURL(new Blob([JSON.stringify(result.document??result.manifest)+'\n'],{type:'application/json'}));
    const link=Object.assign(document.createElement('a'),{href:url,download:filename});link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    rememberOfflineManifest(folder,result.manifest);
    return {...result,message:`Exportado: ${filename}. Reemplaza el archivo de metadatos junto al recurso correspondiente`};
  }
  let handle=handles.get(key);
  if(!handle){
    [handle]=await showOpenFilePicker({id:'tilemap-pack-annotations',multiple:false,types:[{description:filename,accept:{'application/json':[path?'.meta':'.json']}}]});
  }
  const file=await handle.getFile();if(path&&file.name&&file.name!==filename)throw Error(`Selecciona ${filename}`);
  const current=JSON.parse(await file.text());
  const result=update(current);
  const writer=await handle.createWritable();
  try{await writer.write(JSON.stringify(result.document??result.manifest)+'\n');await writer.close();}
  catch(error){try{await writer.abort();}catch{}throw error;}
  handles.set(key,handle);rememberOfflineManifest(folder,result.manifest);
  return {...result,message:`Anotaciones guardadas en ${filename}`};
}
