import {food,nutrients,summarize,weightSeries} from './domain';
export const shiftDate=(date:string,n:number)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const unique=(v:string[])=>[...new Set(v)];
const categories:Record<string,RegExp>={禽肉:/鸡|鸭|鹅/,畜肉:/牛|猪|羊|肉丸/,鱼虾:/鱼|虾|蟹|贝/,蛋类:/蛋/,豆类:/豆|腐|千张/,奶类:/奶|酸乳|乳酪/};
const vegetable=/菜|西兰花|菠菜|生菜|黄瓜|番茄|胡萝卜|菌|菇|藕|海带/;
const wholegrain=/燕麦|糙米|全麦|全谷|藜麦|荞麦|小米|玉米/;
export type Observation={title:string;explanation:string;evidence:string[];limit:string;start:string;end:string};
export function analyze(records:any[],end:string,length=14){
 const start=shiftDate(end,1-length),raw=records.filter(r=>r.status==='confirmed'&&r.date>=start&&r.date<=end);
 let invalidFoods=0;const meals=raw.filter(r=>r.kind==='meal').map(r=>({...r,payload:{...r.payload,foods:(Array.isArray(r.payload?.foods)?r.payload.foods:[]).filter((f:any)=>{const ok=food.safeParse(f).success;if(!ok)invalidFoods++;return ok;})}}));
 const foods=meals.flatMap(r=>r.payload.foods.map((f:any)=>({...f,recordId:r.id,date:r.date,meal:r.payload.meal,n:nutrients({kind:'meal',foods:[f]})}))).filter(f=>f.grams>0);
 const days=unique(meals.map(r=>r.date));const missing=Array.from({length},(_,i)=>shiftDate(start,i)).filter(d=>!days.includes(d));
 const daily=Array.from({length},(_,i)=>{const date=shiftDate(start,i),m=meals.filter(r=>r.date===date);return {date,meals:m.length,slots:unique(m.map(r=>r.payload.meal)),totals:m.length?summarize(m):null};});
 const groups=Object.entries(categories).map(([name,re])=>({name,foods:foods.filter(f=>re.test(f.name+' '+(f.proteinSource||'')))})).filter(g=>g.foods.length);
 const veg=foods.filter(f=>vegetable.test(f.name)),whole=foods.filter(f=>wholegrain.test(f.name)),fiber=foods.filter(f=>f.fiberSource);
 const totals=summarize(meals);const source=foods.filter(f=>f.n.protein>0).sort((a,b)=>b.n.protein-a.n.protein);
 const counts=['早餐','午餐','晚餐','加餐'].map(name=>({name,days:unique(meals.filter(r=>r.payload.meal===name).map(r=>r.date)).length,count:meals.filter(r=>r.payload.meal===name).length}));
 const limitations=`${days.length}/${length} 天有饮食记录，${meals.length} 条已确认饮食；记录是否覆盖实际全部进食无法确定。未记录不代表未进食。${invalidFoods?`有 ${invalidFoods} 项营养数据无效，未纳入计算。`:''}食物分类按名称识别，混合菜无法拆分重量；数值为记录值，不等同于精确测量；零值可能是未知占位，合计可能不完整。`;
 const evidence=foods.map(f=>`${f.date} ${f.meal} · ${f.name} ${f.grams} g`);
 const obs=(title:string,explanation:string,items:string[]=evidence):Observation=>({title,explanation,evidence:items,limit:limitations,start,end});
 const today=meals.filter(r=>r.date===end),todayFoods=foods.filter(f=>f.date===end),todayGroups=groups.filter(g=>g.foods.some(f=>f.date===end));
 const observation=obs(today.length?`已记录 ${today.length} 餐${todayGroups.length?`，食物名称中出现${todayGroups.map(g=>g.name).join('、')}`:''}`:'今天还没有已确认的饮食记录',today.length?`${todayFoods.map(f=>f.name).join('、')||'食物明细不完整'}。${veg.some(f=>f.date===end)?'其中能识别到蔬菜或菌藻类食物；混合菜中的实际份量仍不明确。':'记录名称中未明确识别到蔬菜或菌藻类，不能据此认定没有吃。'}`:'现在只能说明没有可分析的记录，不能判断今天吃得怎么样。',evidence.filter(s=>s.startsWith(end)));
 observation.start=end;observation.limit=`今日 ${today.length} 条已确认饮食，是否记录完整未知。${today.some(r=>r.payload.uncertainty)?today.map(r=>r.payload.uncertainty).filter(Boolean).join('；'):'照片估算、份量和混合菜配料可能影响数值。'}`;
 const habits=[obs(groups.length?`记录中出现 ${groups.length} 类可识别的蛋白质食物`:'暂时无法识别蛋白质食物类别',groups.length?`${groups.map(g=>g.name).join('、')}。这是已记录来源的分布，不代表总蛋白质是否足够。`:'需要更明确的食物名称；营养素为零也可能是录入时未填写。',groups.flatMap(g=>g.foods.map(f=>`${f.date} ${f.meal} · ${f.name} → ${g.name}`))),obs(`蔬菜／菌藻出现于 ${unique(veg.map(f=>f.date)).length} 个记录日，全谷物／玉米出现于 ${unique(whole.map(f=>f.date)).length} 个记录日`,'仅统计名称明确的食物。出现频率不代表份量充足；玉米与全谷物合并展示为粗杂粮线索。',[...veg,...whole].map(f=>`${f.date} ${f.meal} · ${f.name}`)),obs('哪些餐次更常被记录',counts.map(c=>`${c.name} ${c.days} 天（${c.count} 条）`).join('；')+'。记录频率不等于实际进餐频率。',daily.filter(d=>d.meals).map(d=>`${d.date}：${d.slots.join('、')}`))];
 const next= !today.length?obs('下一餐先把主要食物记清楚','拍照时补充主食份量、主要配料和剩余量；有了这一餐，再给出针对性的搭配建议。',[]):!veg.some(f=>f.date===end)?obs('下一餐可以搭配一份清炒西兰花或凉拌黄瓜','今天已记录的名称中没有明确的蔬菜项。如果实际已经吃过蔬菜，可以补充名称，无需为了记录重复进食。',observation.evidence):!todayGroups.some(g=>g.name==='豆类')?obs('下一餐可把豆腐作为一个蛋白质来源','例如番茄豆腐配米饭；今天的记录中未明确出现豆类，换一种来源即可，不需要额外加餐。',observation.evidence):obs('下一餐可以换成鱼肉或鸡蛋搭配蔬菜和主食','例如清蒸鱼配青菜和米饭，或鸡蛋炒青菜配面条；按食欲安排份量，不用抵消上一餐。',observation.evidence);
 next.start=end;next.limit=observation.limit;
 return {start,end,length,meals,foods,days,missing,daily,groups:groups.map(g=>({name:g.name,count:g.foods.length})),counts,totals,source,fiberDays:unique(fiber.map(f=>f.date)).length,invalidFoods,limitations,observation,habits,next,raw};
}
export function weeklyReview(records:any[],date:string){
 const current=analyze(records,date,7),previous=analyze(records,shiftDate(date,-7),7);
 const completeDays=(a:ReturnType<typeof analyze>)=>a.daily.filter(d=>['早餐','午餐','晚餐'].every(s=>d.slots.includes(s))).length;
 const comparable=current.days.length>=4&&previous.days.length>=4&&completeDays(current)>=3&&completeDays(previous)>=3;
 const top=[...current.counts].sort((a,b)=>b.days-a.days)[0];
 const finding=current.meals.length===0?'这七天没有可分析的饮食记录':current.days.length<3?`目前只有 ${current.days.length} 天饮食记录，暂不能判断一周习惯`:current.groups.length>=3?`已记录食物中出现 ${current.groups.length} 类蛋白质来源`:`${top.name}是记录天数最多的餐次（${top.days} 天）`;
 const change=comparable?`两段七天的三餐记录覆盖相对可比：本期 ${completeDays(current)} 天、前期 ${completeDays(previous)} 天有三餐记录。记录日均蛋白质由 ${(previous.totals.protein/previous.days.length).toFixed(1)} g 变为 ${(current.totals.protein/current.days.length).toFixed(1)} g；仍可能受到份量估算和漏记影响，不判断摄入是否足够。`:`前七天有 ${previous.days.length}/7 天饮食记录，本期 ${current.days.length}/7 天；覆盖不足或不一致，暂不比较摄入升降。`;
 const weight=weightSeries(current.raw),activity=current.raw.filter(r=>r.kind==='activity'),active=summarize(activity).activity;
 const recommendation=current.days.length<3?'下周选一天，把早餐、午餐和晚餐各记一次；拍照后补一句大致份量即可。':current.groups.length<2?'下周选一餐，用豆腐或鸡蛋替换一次常吃的肉类，其他搭配照常。':current.habits[1].evidence.length===0?'下周选一顿常吃的主餐，加一道清炒西兰花，并把它一起拍进记录。':'下周选一餐，把混合菜的主要配料和大致份量补充到记录里。';
 return {current,previous,comparable,overview:`${current.start} 至 ${date}，共 ${current.meals.length} 条已确认饮食，覆盖 ${current.days.length}/7 天。另有 ${activity.length} 条活动、${weight.length} 天体重记录。`,finding,interpretation:change+` 活动消耗记录合计 ${Math.round(active)} kcal，仅计算活动热量，排除基础代谢与总消耗。`+(weight.length>=4?` 体重记录首末日均值相差 ${(weight.at(-1)!.kg-weight[0].kg).toFixed(1)} kg；一周波动不能当作长期趋势。`:' 体重记录不足，不判断趋势。'),recommendation};
}
// Stable nutritional snapshot: photo-only changes do not make an interpretation stale.
export function reportStale(report:any,records:any[]):boolean|null{try{const canonical=(rows:any[])=>JSON.stringify(rows.map(r=>{const p=typeof r.payload==='string'?JSON.parse(r.payload):r.payload;const {imageIds,source,...data}=p;return {id:r.id,date:r.date,status:r.status,payload:data};}).sort((a,b)=>a.id.localeCompare(b.id)));const snapshot=JSON.parse(report.snapshot);const start=shiftDate(report.date,snapshot.version===2?-13:-6);return canonical(snapshot.version===2?snapshot.records:snapshot)!==canonical(records.filter(r=>r.status==='confirmed'&&r.date>=start&&r.date<=report.date));}catch{return null;}}
