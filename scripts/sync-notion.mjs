// Anonymous, read-only mirror of the published HLB InfoBank. Remote text is data,
// never code. A complete snapshot is validated before the previous one is replaced.
import {readFile,writeFile,mkdir,rename,rm,readdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {createHash,randomUUID} from "node:crypto";
import {lookup} from "node:dns/promises";
import {isIP} from "node:net";
import https from "node:https";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sha=value=>createHash("sha256").update(value).digest("hex");
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const text=value=>Array.isArray(value) ? value.map(part=>typeof part?.[0]==="string" ? part[0] : "").join("").trim() : "";
const unwrap=record=>record?.value?.value??record?.value??record;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const compact=value=>JSON.parse(JSON.stringify(value));

export function isPublicAddress(address) {
  if (isIP(address)===4) {
    const [a,b]=address.split(".").map(Number);
    return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||
      (a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0))||
      (a===198&&(b===18||b===19)));
  }
  if (isIP(address)===6) {
    const value=address.toLowerCase();
    // Only global-unicast IPv6. This also rejects loopback, mapped IPv4 and LAN addresses.
    return /^[23][0-9a-f]{3}:/.test(value) && !value.startsWith("2001:db8:");
  }
  return false;
}

export function checkedURL(raw,hosts) {
  const url=new URL(raw);
  if (url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443")||
      !hosts.includes(url.hostname.toLowerCase())||isIP(url.hostname.replace(/^\[|\]$/g,""))) {
    throw new Error("Download host is not allowed: "+url.hostname);
  }
  return url;
}

// DNS is resolved and checked before the socket is opened; lookup is pinned to
// those addresses, so a second DNS lookup cannot redirect a request to the LAN.
export async function secureRequest(raw,{hosts,method="GET",headers={},body,maxBytes=12*1024*1024,redirects=4}={}) {
  const url=checkedURL(raw,hosts);
  const addresses=await lookup(url.hostname,{all:true});
  if (!addresses.length||addresses.some(record=>!isPublicAddress(record.address))) throw new Error("Non-public DNS address: "+url.hostname);
  const response=await new Promise((resolve,reject)=>{
    const request=https.request(url,{method,headers:{"user-agent":"HLB-InfoBank-Public-Mirror/1.0","accept-encoding":"identity",
      ...(body?{"content-length":Buffer.byteLength(body)}:{}),...headers},
      lookup:(hostname,options,callback)=>options?.all ? callback(null,addresses) : callback(null,addresses[0].address,addresses[0].family)},res=>{
      const chunks=[];let size=0;
      if (Number(res.headers["content-length"])>maxBytes) {res.destroy();reject(new Error("Response exceeds size limit"));return;}
      res.on("data",chunk=>{size+=chunk.length;if(size>maxBytes){res.destroy(new Error("Response exceeds size limit"));return;}chunks.push(chunk);});
      res.on("error",reject);
      res.on("end",()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    });
    request.setTimeout(45000,()=>request.destroy(new Error("Request timed out")));
    request.on("error",reject);
    if (body) request.write(body);
    request.end();
  });
  if ([301,302,303,307,308].includes(response.status)) {
    if (!redirects||!response.headers.location) throw new Error("Invalid or excessive redirects");
    const next=new URL(response.headers.location,url);
    return secureRequest(next,{hosts,method:response.status===303?"GET":method,headers,body:response.status===303?undefined:body,maxBytes,redirects:redirects-1});
  }
  return response;
}

export function richText(value) {
  return (value??[]).map(part=>{
    const label=typeof part?.[0]==="string" ? part[0] : "";
    const link=part?.[1]?.find(annotation=>annotation[0]==="a")?.[1];
    if (!link||!/^https?:\/\//i.test(link)||label.includes(link)) return label;
    return label&&label!=="‣" ? `${label} (${link})` : link;
  }).join("").trim();
}

function createAPI(config,request) {
  const origin=new URL(config.source).origin;
  const host=new URL(origin).hostname;
  if (!host.endsWith(".notion.site")) throw new Error("Expected a published notion.site source");
  let requests=0;
  return async (name,payload)=>{
    if (++requests>config.limits.maxApiRequests) throw new Error("Notion request limit exceeded");
    const result=await retryRequest(request,`${origin}/api/v3/${name}`,{hosts:[host],method:"POST",
      headers:{"content-type":"application/json"},body:JSON.stringify(payload),maxBytes:24*1024*1024});
    if (result.status!==200) throw new Error(`Notion ${name} returned HTTP ${result.status}`);
    const json=JSON.parse(result.body.toString("utf8"));
    if (json.errorId||json.error) throw new Error(`Notion ${name} returned an error`);
    return json;
  };
}

async function retryRequest(request,url,options) {
  for(let attempt=0;attempt<3;attempt++) {
    try {
      const response=await request(url,options);
      if((response.status===429||response.status>=500)&&attempt<2) {await delay(attempt?3000:1000);continue;}
      return response;
    } catch(error) {
      if(attempt===2||/not allowed|Non-public|size limit|exceeds size/.test(error.message))throw error;
      await delay(attempt?3000:1000);
    }
  }
}

export async function crawlNotion(config,{request=secureRequest}={}) {
  if (!uuid.test(config.rootPageId)) throw new Error("Invalid root page ID");
  const api=createAPI(config,request), maps={}, children={}, seen=new Set();
  function merge(recordMap) {
    for(const [table,records]of Object.entries(recordMap??{})) if(records&&typeof records==="object") {
      maps[table]??={};
      for(const [id,record]of Object.entries(records)) maps[table][id]=unwrap(record);
    }
  }
  let cursor={stack:[]},chunkNumber=0;
  do {
    const result=await api("loadPageChunk",{pageId:config.rootPageId,limit:100,cursor,chunkNumber:chunkNumber++,verticalColumns:false});
    if (!result.recordMap?.block||!Array.isArray(result.cursor?.stack)) throw new Error("Incomplete root page response");
    merge(result.recordMap);cursor=result.cursor;
  } while(cursor.stack.length);
  async function records(ids,table="block") {
    const missing=ids.filter(id=>!maps[table]?.[id]);
    if (!missing.length) return;
    if (missing.some(id=>!uuid.test(id))) throw new Error("Invalid referenced block ID");
    const result=await api("getRecordValues",{requests:missing.map(id=>({id,table}))});
    if (!Array.isArray(result.results)||result.results.length!==missing.length) throw new Error("Incomplete referenced block response");
    maps[table]??={};
    missing.forEach((id,index)=>{const value=unwrap(result.results[index]);if(value?.id!==id||value.alive===false)throw new Error("Referenced public block is unavailable: "+id);maps[table][id]=value;});
  }
  const queue=[config.rootPageId];
  while(queue.length) {
    const batch=[...new Set(queue.splice(0,80))].filter(id=>!seen.has(id));
    await records(batch);
    for(const id of batch) {
      if(seen.size>=config.limits.maxBlocks) throw new Error("Block crawl limit exceeded");
      seen.add(id);
      const block=maps.block[id];
      if (!block?.type||block.alive===false) throw new Error("Public block is missing or deleted: "+id);
      children[id]=[...(block.content??[])];
      if(block.type.startsWith("collection_view")) {
        const viewId=block.view_ids?.[0];
        if(!viewId)throw new Error("Collection has no public view: "+id);
        await records([viewId],"collection_view");
        const collectionId=block.collection_id??block.format?.collection_pointer?.id??maps.collection_view[viewId]?.format?.collection_pointer?.id;
        if(!collectionId)throw new Error("Collection reference is missing: "+id);
        await records([collectionId],"collection");
        const result=await api("queryCollection",{collectionId,collectionViewId:viewId,loader:{type:"reducer",
          reducers:{collection_group_results:{type:"results",limit:config.limits.maxCollectionRows}},searchQuery:"",userTimeZone:"Asia/Seoul"}});
        const rows=result.result?.reducerResults?.collection_group_results;
        if(!rows||!Array.isArray(rows.blockIds)||rows.hasMore!==false) throw new Error("Public collection is incomplete: "+id);
        merge(result.recordMap);
        block.resolvedCollectionId=collectionId;
        children[id].push(...rows.blockIds);
      }
      // A synced block can reference its original instead of containing children.
      if(block.type==="transclusion_reference") {
        const reference=block.format?.transclusion_reference_pointer?.id;
        if(!reference)throw new Error("Synced block reference is missing");
        children[id].push(reference);
      }
      queue.push(...children[id]);
    }
  }
  return {maps,children,seen:[...seen]};
}

function languageFor(value,fallback="국문") {
  if(/국문|한국어|Korean/i.test(value))return "국문";
  if(/영문|영어/i.test(value))return "영문";
  if(/日本|Japanese|IR資料/i.test(value)) return "일문";
  if(/中國|Chinese|中文/i.test(value)) return "중문";
  if(/\bEnglish\b|\bEng\.?\b/i.test(value)) return "영문";
  return fallback;
}
function spaceFor(value,fallback="group") {
  if(/ESG|지속가능/i.test(value))return "esg";
  if(/제품|Product/i.test(value))return "product";
  if(/\bIR\b|Investor|분기|반기|사업보고서|Quarterly|Annual|Business Report/i.test(value))return "ir";
  if(/비전|슬로건|브로슈어|Brochure|회사소개|Company|홍보영상/i.test(value))return "brand";
  if(/지도|주소|전화|소셜|Social|Map/i.test(value))return "group";
  return fallback;
}
function safeMedia(raw,title,blockId) {
  let url;try {url=new URL(raw);}catch{return null;}
  if(!["https:","http:"].includes(url.protocol)||url.username||url.password)return null;
  const host=url.hostname.toLowerCase();
  if(host==="www.youtube.com"||host==="youtube.com"||host==="youtu.be") {
    const video=host==="youtu.be"?url.pathname.slice(1):url.searchParams.get("v")??url.pathname.split("/").pop();
    if(!/^[\w-]{11}$/.test(video))return null;
    return {type:"embed",url:`https://www.youtube.com/embed/${video}?rel=0`,title,source:raw};
  }
  if(host==="drive.google.com"&&/\/file\/d\/([\w-]+)/.test(url.pathname)) return {type:"embed",url:`https://drive.google.com/file/d/${url.pathname.match(/\/file\/d\/([\w-]+)/)[1]}/preview`,title,source:raw};
  if(host==="www.google.com"&&url.pathname.startsWith("/maps/")&&url.searchParams.get("mid"))return {type:"embed",url:`https://www.google.com/maps/d/embed?mid=${encodeURIComponent(url.searchParams.get("mid"))}`,title,source:raw};
  if(host==="heyzine.com"&&/^\/flip-book\/[\w-]+\.html$/.test(url.pathname))return {type:"heyzine",url:url.href,title,source:url.href,blockId};
  if(/\.pdf$/i.test(url.pathname))return {type:"remote-pdf",url:url.href,title,source:url.href,blockId};
  if(/\.(?:png|jpe?g|webp)$/i.test(url.pathname))return {type:"remote-image",url:url.href,title,source:url.href,blockId};
  return {type:"link",url:url.href,title,source:raw};
}

export function extractResources(tree,config) {
  const {maps,children}=tree, resources=[],seen=new Set();
  function titleOf(block) {return text(block.properties?.title)||text(maps.collection?.[block.resolvedCollectionId]?.name);}
  function contents(page) {
    const sections=[],media=[],links=[];let current={heading:"자료 내용",items:[]};
    const flush=()=>{if(current.text||current.items?.length||current.rows?.length)sections.push(current);};
    const visited=new Set();
    function visit(id) {
      if(visited.has(id))return;visited.add(id);
      const block=maps.block[id];
      if(id!==page.id&&(block.type==="page"||block.type==="collection_view_page"))return;
      if(block.type.startsWith("collection_view")) {
        const collection=maps.collection[block.resolvedCollectionId];
        const schema=collection.schema??{};
        const columns=Object.keys(schema).filter(key=>schema[key].type!=="file").sort((a,b)=>a==="title"?-1:b==="title"?1:0);
        const rows=[columns.map(key=>schema[key].name),...(children[id]??[]).map(rowId=>columns.map(key=>richText(maps.block[rowId]?.properties?.[key])))];
        for(const rowId of children[id]??[]) {
          const row=maps.block[rowId];
          for(const key of Object.keys(schema).filter(key=>schema[key].type==="file")) {
            for(const part of row.properties?.[key]??[]) {
              for(const annotation of part[1]??[]) {
                if(annotation[0]!=="a")continue;
                const source=annotation[1],title=`${text(row.properties?.title)} · ${part[0]}`;
                if(source.startsWith("attachment:")&&/\.(?:png|jpe?g|webp)$/i.test(source))media.push({type:"attachment-image",url:source,source,title,blockId:rowId});
                else if(source.startsWith("attachment:")&&/\.pdf$/i.test(source))media.push({type:"attachment-pdf",url:source,source,title,blockId:rowId});
                else {const item=safeMedia(source,title,rowId);if(item&&item.type!=="link")media.push(item);}
              }
            }
          }
        }
        flush();sections.push({heading:text(collection.name)||"공개 데이터베이스",rows});current={heading:"자료 내용",items:[]};
        return;
      }
      if(block.type==="table") {
        const columns=block.format?.table_block_column_order??[];
        if(!columns.length)throw new Error("Public table column order is missing: "+id);
        const rows=(children[id]??[]).map(rowId=>columns.map(key=>richText(maps.block[rowId]?.properties?.[key])));
        if(!block.format?.table_block_column_header)rows.unshift(columns.map((_,index)=>`항목 ${index+1}`));
        flush();sections.push({heading:current.heading,rows});current={heading:"자료 내용",items:[]};return;
      }
      const title=richText(block.properties?.title);
      if(/header$/.test(block.type)) {flush();current={heading:title||"자료 내용",items:[]};}
      else if(title&&id!==page.id)current.items.push(title);
      const source=text(block.properties?.source)||text(block.properties?.link)||block.format?.display_source;
      if(source) {
        if(source.startsWith("attachment:")&&/\.pdf$/i.test(source))media.push({type:"attachment-pdf",url:source,source,title:titleOf(page),blockId:id});
        else if(source.startsWith("attachment:")&&/\.(?:png|jpe?g|webp)$/i.test(source))media.push({type:"attachment-image",url:source,source,title:titleOf(page),blockId:id});
        else {const item=safeMedia(block.type==="maps"?block.format?.display_source||source:source,titleOf(page),id);if(item?.type==="link")links.push(item.url);else if(item)media.push(item);}
      }
      for(const child of children[id]??[])visit(child);
    }
    visit(page.id);flush();
    if(links.length)sections.push({heading:"관련 링크",items:[...new Set(links)]});
    return {sections,media};
  }
  function walk(id,context={space:"group",label:"",language:"국문"},depth=0) {
    if(depth>30)throw new Error("Nested page depth limit exceeded");
    if(seen.has(id))return;seen.add(id);
    const block=maps.block[id], title=titleOf(block);
    const isPage=block.type==="page"||block.type==="collection_view_page";
    if(id!==config.rootPageId&&isPage&&block.parent_table!=="collection") {
      const known=config.records[id];
      const space=known?.space??spaceFor(title,context.space);
      const body=contents(block);
      const summary=body.sections.flatMap(section=>section.items??[]).find(item=>item.length>12&&!/^https?:/.test(item))?.slice(0,240)||`${title}의 공개 자료를 체험관에서 확인합니다.`;
      const year=title.match(/20\d{2}/)?.[0];
      resources.push(compact({id:known?.id??"notion-"+id.replaceAll("-",""),space,title,
        company:title.match(/^\[([^\]]+)\]/)?.[1]||"HLB그룹",
        type:/보고서|Report/i.test(title)?(/ESG/i.test(title)?"ESG 보고서":"정기보고서"):/영상|Video/i.test(title)?"영상":space==="product"?"제품 카탈로그":space==="ir"?"IR 자료":space==="brand"?"브랜드 자료":"그룹 안내",
        language:languageFor(title,context.language),year:year?Number(year):undefined,
        description:summary,keywords:[title,context.label].filter(Boolean),
        url:new URL("/"+id.replaceAll("-",""),config.source).href,notionPageId:id,
        reading:{source:new URL("/"+id.replaceAll("-",""),config.source).href,summary,sections:body.sections},pendingMedia:body.media}));
      if(resources.length>config.limits.maxPages)throw new Error("Page crawl limit exceeded");
      if(block.type==="collection_view_page")return;
      context={...context,space};
    }
    let childContext={...context};
    for(const child of children[id]??[]) {
      const next=maps.block[child], label=titleOf(next);
      if(/header$/.test(next.type))childContext={space:spaceFor(label,childContext.space),label,
        language:/국문|영문|English|日本|Japanese|中國|Chinese|中文|한국어|영어|Korean/i.test(label)?languageFor(label):childContext.language};
      walk(child,childContext,depth+1);
    }
  }
  walk(config.rootPageId);
  if(!resources.length)throw new Error("The public source contains no resources");
  return resources;
}

export function extractHeyzinePDF(html,base) {
  for(const tag of html.match(/<a\b[^>]*>/gi)??[]) {
    if(!/\bid=["']btnDownPdf["']/i.test(tag))continue;
    const href=tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if(href)return new URL(href.replaceAll("&amp;","&"),base).href;
  }
  return null;
}
export function validPDF(buffer) {return buffer.length>8&&buffer.subarray(0,5).toString()==="%PDF-";}
export function imageFormat(buffer,contentType) {
  const mime=contentType?.split(";")[0]?.trim();
  if(mime==="image/jpeg"&&buffer.length>4&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return "jpg";
  if(mime==="image/png"&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return "png";
  if(mime==="image/webp"&&buffer.length>12&&buffer.subarray(0,4).toString()==="RIFF"&&buffer.subarray(8,12).toString()==="WEBP")return "webp";
  return null;
}

async function optionalJSON(filename) {
  try{return JSON.parse(await readFile(filename,"utf8"));}catch(error){if(error.code==="ENOENT")return null;throw error;}
}
function localPath(root,relative) {
  const full=path.resolve(root,relative);
  if(!full.startsWith(path.resolve(root)+path.sep))throw new Error("Output path leaves workspace");
  return full;
}

export async function synchronize({root=ROOT,config,request=secureRequest,now=()=>new Date().toISOString(),log=console.log}={}) {
  config??=await optionalJSON(path.join(root,"config/notion-sync.json"));
  if(!config)throw new Error("Missing config/notion-sync.json");
  const output=localPath(root,config.output),directory=path.dirname(output);
  const previous=await optionalJSON(output);
  const tree=await crawlNotion(config,{request});
  const resources=extractResources(tree,config);
  log(`Notion: ${tree.seen.length} blocks, ${resources.length} resources collected`);
  const oldFiles=new Map((previous?.files??[]).map(file=>[file.source,file]));
  const files=new Map(),resolved=new Map(),staged=new Map(),countedHashes=new Set();let totalBytes=0;
  const staging=path.join(root,"dist","notion-sync-"+randomUUID());
  await mkdir(staging,{recursive:true});
  async function download(raw,source=raw,kind="pdf") {
    if(files.has(source))return files.get(source);
    if(files.size>=config.limits.maxDownloads)throw new Error("Download count limit exceeded");
    checkedURL(raw,config.downloadHosts);
    const old=oldFiles.get(source),headers={};let oldBytes;
    if(old) {
      try {oldBytes=await readFile(localPath(root,old.url));if(!(kind==="pdf"?validPDF(oldBytes):imageFormat(oldBytes,old.contentType))||sha(oldBytes)!==old.sha256)oldBytes=null;}catch{}
      if(oldBytes) {if(old.etag)headers["if-none-match"]=old.etag;else if(old.lastModified)headers["if-modified-since"]=old.lastModified;}
    }
    const maximum=kind==="pdf"?config.limits.maxPdfBytes:(config.limits.maxImageBytes??8*1024*1024);
    const response=await retryRequest(request,raw,{hosts:config.downloadHosts,headers,maxBytes:maximum});
    const bytes=response.status===304&&oldBytes?oldBytes:response.body;
    if(![200,304].includes(response.status)||(response.status===304&&!oldBytes))throw new Error("Attachment download failed with HTTP "+response.status);
    const contentType=response.headers["content-type"]??old?.contentType??(kind==="pdf"?"application/pdf":undefined);
    const extension=kind==="pdf"?(validPDF(bytes)?"pdf":null):imageFormat(bytes,contentType);
    if(!extension)throw new Error("Downloaded attachment has an invalid "+kind+" signature or content type: "+new URL(raw).hostname);
    if(bytes.length>maximum)throw new Error("Attachment size limit exceeded");
    const hash=sha(bytes);
    if(!countedHashes.has(hash)) {totalBytes+=bytes.length;countedHashes.add(hash);}
    if(totalBytes>config.limits.maxTotalBytes)throw new Error("Total PDF size limit exceeded");
    const relative=path.posix.join(path.posix.dirname(config.output),"files",hash+"."+extension);
    if(!staged.has(hash)) {await writeFile(path.join(staging,hash+"."+extension),bytes);staged.set(hash,relative);}
    const file=compact({source,url:relative,sha256:hash,bytes:bytes.length,type:kind,contentType,
      etag:response.headers.etag??old?.etag,lastModified:response.headers["last-modified"]??old?.lastModified});
    files.set(source,file);
    if(files.size%10===0)log(`Notion: ${files.size} attachments verified (${(totalBytes/1048576).toFixed(1)} MiB)`);
    return file;
  }
  async function resolveMedia(media) {
    if(resolved.has(media.source))return {...resolved.get(media.source),title:media.title};
    let result=media;
    if(media.type==="heyzine") {
      const html=await retryRequest(request,media.url,{hosts:config.downloadHosts,maxBytes:4*1024*1024});
      if(html.status!==200)throw new Error("Heyzine viewer returned HTTP "+html.status);
      const pdf=extractHeyzinePDF(html.body.toString("utf8"),media.url);
      if(!pdf)throw new Error("Public PDF download link is missing: "+media.url);
      const file=await download(pdf);
      result={type:"pdf",url:file.url,sha256:file.sha256,title:media.title,source:media.source};
    } else if(["remote-pdf","attachment-pdf","remote-image","attachment-image"].includes(media.type)) {
      let raw=media.url;
      if(media.type.startsWith("attachment-")) {
        const api=createAPI(config,request);
        const signed=await api("getSignedFileUrls",{urls:[{url:media.url,permissionRecord:{table:"block",id:media.blockId}}]});
        raw=signed.signedUrls?.[0];
        if(!raw)throw new Error("Public attachment URL is unavailable");
      }
      const kind=media.type.endsWith("image")?"image":"pdf";
      const file=await download(raw,media.source,kind);
      result={type:kind,url:file.url,sha256:file.sha256,title:media.title,source:media.source};
    }
    resolved.set(media.source,result);return result;
  }
  async function pruneUnreferenced(snapshot) {
    const filesDirectory=localPath(root,path.posix.join(path.posix.dirname(config.output),"files"));
    const retained=new Set((snapshot.files??[]).map(file=>path.basename(file.url)));
    try {
      for(const entry of await readdir(filesDirectory,{withFileTypes:true})) {
        if(!entry.isFile()||!/^[a-f0-9]{64}\.(?:pdf|jpg|png|webp)$/.test(entry.name)||retained.has(entry.name))continue;
        const target=path.resolve(filesDirectory,entry.name);
        if(path.dirname(target)!==filesDirectory)throw new Error("Prune target leaves PDF directory");
        await rm(target);
      }
    } catch(error) {if(error.code!=="ENOENT")log("Notion: unused PDF cleanup deferred: "+error.message);}
  }
  try {
    for(const resource of resources) {
      const media=[];
      for(const candidate of resource.pendingMedia)media.push(await resolveMedia(candidate));
      delete resource.pendingMedia;
      if(media.length) {
        resource.reading.media=media[0];
        if(media.length>1)resource.reading.attachments=media.slice(1);
        resource.reading.source=/^https:\/\//.test(media[0].source)?media[0].source:resource.url;
      }
      if(!resource.reading.sections.length)resource.reading.sections=[{heading:"자료 안내",text:resource.reading.summary}];
      resource.contentHash=sha(JSON.stringify(resource));
    }
    const contentHash=sha(JSON.stringify(resources));
    if(previous?.contentHash===contentHash) {
      await pruneUnreferenced(previous);
      log("Notion: no content changes; previous snapshot retained");
      return {changed:false,resources:resources.length,bytes:totalBytes,contentHash};
    }
    const snapshot={schemaVersion:1,source:config.source,checkedAt:now(),contentHash,
      blockCount:tree.seen.length,resources,files:[...files.values()]};
    // Content-addressed files are installed first. The atomic catalog rename is
    // the commit point; failure leaves the old catalog and all old PDFs usable.
    for(const [hash,relative]of staged) {
      const destination=localPath(root,relative);
      await mkdir(path.dirname(destination),{recursive:true});
      try {if(sha(await readFile(destination))===hash)continue;}catch(error){if(error.code!=="ENOENT")throw error;}
      await rename(path.join(staging,path.basename(relative)),destination).catch(async error=>{
        // Windows cannot replace an existing destination on every filesystem.
        if(error.code!=="EEXIST"&&error.code!=="EPERM")throw error;
        const existing=await readFile(destination);if(sha(existing)!==hash)throw error;
      });
    }
    await mkdir(directory,{recursive:true});
    const temporary=path.join(directory,".catalog-"+randomUUID()+".json");
    await writeFile(temporary,JSON.stringify(snapshot,null,2)+"\n");
    await rename(temporary,output);
    await pruneUnreferenced(snapshot);
    log(`Notion: published ${resources.length} resources, ${files.size} attachments (${(totalBytes/1048576).toFixed(1)} MiB)`);
    return {changed:true,resources:resources.length,bytes:totalBytes,contentHash};
  } finally {await rm(staging,{recursive:true,force:true});}
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) {
  synchronize().catch(error=>{console.error("Notion sync stopped; the last successful catalog is unchanged:",error.message);process.exitCode=1;});
}
