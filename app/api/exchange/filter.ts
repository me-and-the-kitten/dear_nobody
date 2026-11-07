const substitutions:Record<string,string>={a:'а',e:'е',o:'о',x:'х',y:'у',c:'с',p:'р',k:'к',m:'м',t:'т',b:'в',u:'у',h:'х',i:'и','0':'о','3':'з','4':'ч','6':'б','@':'а','ё':'е'};
export function normalizeText(value:string){return value.normalize('NFKC').toLowerCase().replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff\p{M}]/gu,'');}
const roots=['хуй','хуя','хуе','хуи','нахуй','похуй','охуе','охуи','ахуе','ахуи','нихуя','нехуй','пизд','пезд','распизд','спизд','бляд','блять','бляха','еба','ебу','ебл','ебн','ебуч','заеб','наеб','выеб','уеб','отъеб','подъеб','долбоеб','мудак','мудил','гандон','говно','дерьм','шлюх','пидор','пидар','пидр','залуп','жоп','сучк'];
// A masking symbol may replace one letter; separators may be inserted between letters.
const maskedRoots=new RegExp('(?:^|[^а-я])(?:'+roots.map(w=>[...w].map(c=>'['+c+'#*•_]').join('[.\\s-]*')).join('|')+')[а-я#*•_]*','u');
export function hasProfanity(text:string){
 const raw=normalizeText(text); const mapped=raw.replace(/[aeoxycpkmtbuhi0346ё@]/g,c=>substitutions[c]);
 return maskedRoots.test(mapped)||/(?:^|[^а-я])(?:бля|сука|суки|сук|дебил[а-я]*|идиот[а-я]*|тупица|тупицы|мразь|мрази|урод|уроды|урода|уродка|скотина|скотины)(?:$|[^а-я])/u.test(mapped)||/\b(?:f[u*#]ck\w*|sh[i*#]t|b[i*#]tch\w*|asshole\w*)\b/i.test(raw);
}
export function hasSpam(text:string){
 const raw=normalizeText(text);
 const expanded=raw.replace(/\s*(?:\[точка\]|\(точка\)|\[dot\]|\(dot\))\s*/g,'.');
 return /(?:https?\s*:|hxxps?\s*:|www\s*\.|t\s*\.\s*me\b|telegram\s*\.)/iu.test(expanded)
 || /(?:^|[^\p{L}\p{N}])[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.[a-z]{2,24}(?:[^a-z]|$)/iu.test(expanded)
 || /[\p{L}\p{N}][\p{L}\p{N}-]*\s*\.\s*(?:ru|рф|com|net|org|io|me|xyz|online|site|shop|рy|su|dev|app|link|info|biz|cc|tv|top|pro|рyc|club|click)(?:[^\p{L}]|$)/iu.test(expanded)
 || /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:^|\s)@[a-z0-9_]{3,}/iu.test(raw)
 || /(?:промокод|реферальн|скидк[ауи].{0,35}(?:код|заказ|покуп)|подпиш[а-я]*.{0,35}(?:канал|блог|аккаунт)|(?:(?:^|[^а-я])(?:купи|покупай|заказывай|закажите)(?:$|[^а-я])|заработок без|легкий заработок|пассивный доход)|(?:переходи|переходите).{0,25}(?:ссылк|профил)|(?:казино|ставки на спорт)|рекламная рассылка)/iu.test(raw);
}
export function isGibberish(text:string){
 const normal=normalizeText(text);const letters=normal.match(/\p{L}/gu)||[];
 const words=normal.match(/\p{L}+/gu)||[];
 if(letters.length<15||letters.length/normal.replace(/\s/g,'').length<.55||words.length<3)return true;
 if(/(.)\1{5,}|(.{2,5})\2{5,}/u.test(normal.replace(/\s/g,'')))return true;
 const counts=new Map<string,number>();for(const w of words)counts.set(w,(counts.get(w)||0)+1);
 if(words.length>=5&&(Math.max(...counts.values())/words.length>=.6||counts.size<=2))return true;
 const suspicious=words.filter(w=>w.length>=5&&(/(?:йцук|цукен|фыва|ывап|ячсм|qwert|asdf|zxcv)/iu.test(w)||/[бвгджзйклмнпрстфхцчшщbcdfghjklmnpqrstvwxyz]{7,}/iu.test(w)||!/[аеёиоуыэюяaeiouy]/iu.test(w)));
 return suspicious.length>=2&&suspicious.length/words.length>=.4;
}
export function validateLetter(text:string):string|null{
 const length=[...text.trim()].length;
 if(length<25||length>4000)return 'Напишите от 25 до 4000 символов — хотя бы несколько слов от себя.';
 if(hasProfanity(text))return 'Давайте бережно друг к другу. Уберите брань и оскорбления — и письмо отправится.';
 if(hasSpam(text))return 'В нашей почте нет ссылок и рекламы. Уберите их и оставьте свою историю.';
 if(isGibberish(text))return 'Кажется, в письме слишком много повторов или случайных символов. Напишите несколько осмысленных фраз от себя.';
 return null;
}

