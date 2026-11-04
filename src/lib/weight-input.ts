export type WeightUnit='kg'|'斤'|'lb';
export const defaultWeightUnit=(profile:string):WeightUnit=>profile==='girlfriend'?'斤':'kg';
export const toKg=(value:number,unit:WeightUnit)=>unit==='斤'?value/2:unit==='lb'?value*0.45359237:value;
export const fromKg=(kg:number,unit:WeightUnit)=>unit==='斤'?kg*2:unit==='lb'?kg/0.45359237:kg;
export const weightText=(kg:number|null,unit:WeightUnit)=>kg===null||!Number.isFinite(kg)||kg<=0?'':String(Number(fromKg(kg,unit).toFixed(6)));
export function parseWeight(text:string,unit:WeightUnit):number|null{if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))return null;return toKg(Number(text),unit);}
export function initialRecord(payload:any,profile:string){return payload?.kind==='weight'&&!(payload.kg>0)?{...payload,kg:null,originalUnit:defaultWeightUnit(profile)}:payload;}
