import {env} from 'cloudflare:workers';
import {seeds} from './seeds';
import {validateLetter} from './filter';
const PAUSE=300_000, NETWORK_PAUSE=30_000;
const guest=(req:Request)=>req.headers.get('cookie')?.match(/(?:^|;\s*)letter_guest=([0-9a-f-]{36})(?:;|$)/)?.[1];
function headers(req:Request,owner:string){return {'Set-Cookie':`letter_guest=${owner}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${new URL(req.url).protocol==='https:'?'; Secure':''}`,'Cache-Control':'no-store'};}
async function networkKey(req:Request){
 // Only the edge-provided IP is used. No raw IP is persisted.
 const ip=req.headers.get('cf-connecting-ip');if(!ip)return '';
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('dear-nobody:'+new Date().toISOString().slice(0,10)+':'+ip));
 return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
}
async function cooldown(db:D1Database,owner:string,network:string){
 const row=await db.prepare('SELECT MAX(CASE WHEN owner=? THEN created_at+? ELSE created_at+? END) AS until_time FROM exchanges WHERE applied=1 AND (owner=? OR (network=? AND network<>?))').bind(owner,PAUSE,NETWORK_PAUSE,owner,network,'').first<{until_time:number|null}>();
 return Math.max(0,Math.ceil(((row?.until_time||0)-Date.now())/1000));
}
export async function GET(req:Request){const owner=guest(req)||crypto.randomUUID();try{
 const db=env.DB!;const row=await db.prepare('SELECT COUNT(*) AS n FROM exchanges WHERE applied=1').first<{n:number}>();
 return Response.json({count:549+(row?.n||0),retryAfter:await cooldown(db,owner,await networkKey(req))},{headers:headers(req,owner)});
}catch{return Response.json({error:'Почта пока недоступна.'},{status:503});}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Запрос с другого сайта отклонён.'},{status:403});
 const raw=await req.text();if(raw.length>24000)return Response.json({error:'Письмо слишком длинное.'},{status:413});
 let input;try{input=JSON.parse(raw);}catch{return Response.json({error:'Не удалось прочитать письмо.'},{status:400});}
 if(!input||typeof input!=='object')return Response.json({error:'Не удалось прочитать письмо.'},{status:400});
 const {body,envelope,paper,id}=input;
 if(typeof body!=='string'||!Number.isInteger(envelope)||envelope<1||envelope>9||!Number.isInteger(paper)||paper<0||paper>2||typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id))return Response.json({error:'Проверьте текст и выбранный конверт.'},{status:400});
 const owner=guest(req);if(!owner)return Response.json({error:'Разрешите cookies для анонимного обмена и обновите страницу.'},{status:409});
 const db=env.DB!,network=await networkKey(req);
 // Restore a completed exchange before validation and cooldown checks.
 const previous=await db.prepare('SELECT owner,body,envelope,paper FROM exchanges WHERE id=? AND applied=1').bind(id).first<{owner:string;body:string;envelope:number;paper:number}>();
 if(previous){if(previous.owner!==owner)return Response.json({error:'Не удалось восстановить обмен.'},{status:409});const {owner:_,...letter}=previous;return Response.json({letter,retryAfter:await cooldown(db,owner,network)},{headers:headers(req,owner)});}
 const error=validateLetter(body);if(error)return Response.json({error},{status:422});
 const limited=async()=>{const retryAfter=await cooldown(db,owner,network);return Response.json({error:'Немного паузы между письмами. Следующий конверт можно отправить после таймера.',retryAfter},{status:429,headers:{...headers(req,owner),'Retry-After':String(retryAfter)}});};
 if(await cooldown(db,owner,network)>0)return limited();
 await db.batch(seeds.map((text,i)=>db.prepare('INSERT OR IGNORE INTO letters (slot,body,envelope,paper,owner) VALUES (?,?,?,?,?)').bind(i,text,i%9+1,i%3,'editor')));
 const now=Date.now();
 const result=await db.batch([
  db.prepare('INSERT OR IGNORE INTO exchanges (id,owner,slot,body,envelope,paper,applied,created_at,network) SELECT ?,?,slot,body,envelope,paper,0,?,? FROM letters WHERE owner<>? AND NOT EXISTS (SELECT 1 FROM exchanges WHERE (owner=? AND created_at>?) OR (network=? AND network<>? AND created_at>?)) ORDER BY RANDOM() LIMIT 1').bind(id,owner,now,network,owner,owner,now-PAUSE,network,'',now-NETWORK_PAUSE),
  db.prepare('UPDATE letters SET body=?,envelope=?,paper=?,owner=? WHERE slot=(SELECT slot FROM exchanges WHERE id=? AND owner=? AND applied=0)').bind(body.trim(),envelope,paper,owner,id,owner),
  db.prepare('UPDATE exchanges SET applied=1 WHERE id=? AND owner=?').bind(id,owner),
  db.prepare('SELECT body,envelope,paper FROM exchanges WHERE id=? AND owner=?').bind(id,owner)
 ]);
 const letter=result[3].results[0];
 if(!letter&&await cooldown(db,owner,network)>0)return limited();
 return Response.json(letter?{letter,retryAfter:PAUSE/1000}:{error:'Сейчас в почте остались только ваши письма. Дождитесь других отправителей.'},{status:letter?200:409,headers:headers(req,owner)});
}catch{return Response.json({error:'Почта временно недоступна. Ваш текст сохранён — попробуйте ещё раз.'},{status:503});}}
