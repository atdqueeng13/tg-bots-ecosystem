"use strict";(()=>{var e={};e.id=337,e.ids=[337],e.modules={3524:e=>{e.exports=require("@prisma/client")},2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2254:e=>{e.exports=require("node:buffer")},6005:e=>{e.exports=require("node:crypto")},7261:e=>{e.exports=require("node:util")},5798:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>p,patchFetch:()=>I,requestAsyncStorage:()=>U,routeModule:()=>d,serverHooks:()=>l,staticGenerationAsyncStorage:()=>c});var T={};a.r(T),a.d(T,{DELETE:()=>u,GET:()=>L,POST:()=>A});var r=a(9303),s=a(8716),n=a(670),E=a(7070),o=a(2331),i=a(9178),N=a(2957);async function L(e){try{if(await (0,N.R)(),!await (0,i.Z9)(e))return E.NextResponse.json({error:"Unauthorized"},{status:401});let t=(await o._.geminiApiKey.findMany({orderBy:{createdAt:"desc"}})).map(e=>({id:e.id,name:e.name,maskedKey:e.key.length>8?`${e.key.substring(0,7)}...${e.key.substring(e.key.length-4)}`:"••••••••",status:e.status,latencyMs:e.latencyMs,requestCount:e.requestCount,lastUsedAt:e.lastUsedAt}));return E.NextResponse.json({keys:t})}catch(e){return E.NextResponse.json({error:e?.message},{status:500})}}async function A(e){try{if(!await (0,i.Z9)(e))return E.NextResponse.json({error:"Unauthorized"},{status:401});let{name:t,key:a}=await e.json();if(!a||""===a.trim())return E.NextResponse.json({error:"API ключ обязателен"},{status:400});let T=await o._.geminiApiKey.create({data:{name:t||"Gemini Secondary",key:a.trim(),status:"ACTIVE",latencyMs:120}});return E.NextResponse.json({success:!0,key:T})}catch(e){return E.NextResponse.json({error:e?.message},{status:500})}}async function u(e){try{if(!await (0,i.Z9)(e))return E.NextResponse.json({error:"Unauthorized"},{status:401});let{searchParams:t}=new URL(e.url),a=t.get("id");if(!a)return E.NextResponse.json({error:"ID обязателен"},{status:400});return await o._.geminiApiKey.delete({where:{id:a}}),E.NextResponse.json({success:!0})}catch(e){return E.NextResponse.json({error:e?.message},{status:500})}}let d=new r.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/gemini-keys/route",pathname:"/api/gemini-keys",filename:"route",bundlePath:"app/api/gemini-keys/route"},resolvedPagePath:"C:\\game1\\admin-panel\\app\\api\\gemini-keys\\route.ts",nextConfigOutput:"",userland:T}),{requestAsyncStorage:U,staticGenerationAsyncStorage:c,serverHooks:l}=d,p="/api/gemini-keys/route";function I(){return(0,n.patchFetch)({serverHooks:l,staticGenerationAsyncStorage:c})}},9178:(e,t,a)=>{a.d(t,{Gg:()=>N,Z9:()=>L,ed:()=>o});var T=a(6091),r=a(6176),s=a(1615);let n=new TextEncoder().encode(process.env.JWT_SECRET||"sherlock-admin-secret-key-2026-very-secure-jwt-token-alpha"),E="sherlock_admin_token";async function o(e,t="Главный следователь"){return await new T.N({email:e,name:t,role:"admin"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("7d").sign(n)}async function i(e){try{return(await (0,r._)(e,n)).payload}catch{return null}}async function N(){let e=(0,s.cookies)(),t=e.get(E)?.value;return t?await i(t):null}async function L(e){let t=e.cookies.get(E)?.value;if(!t){let t=e.headers.get("Authorization");return t&&t.startsWith("Bearer ")?await i(t.substring(7)):null}return await i(t)}},2331:(e,t,a)=>{a.d(t,{_:()=>r});var T=a(3524);let r=globalThis.prisma??new T.PrismaClient({log:["error"]})},2957:(e,t,a)=>{a.d(t,{R:()=>s});var T=a(2331);let r=!1;async function s(){if(!r)try{await T._.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Admin" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL DEFAULT 'Главный следователь',
        "passwordHash" TEXT NOT NULL DEFAULT '',
        "clearanceLevel" INTEGER NOT NULL DEFAULT 4,
        "role" TEXT NOT NULL DEFAULT 'ADMIN',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),await T._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");'),await T._.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Group" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "reward" TEXT DEFAULT '$4,500',
        "lore" TEXT NOT NULL,
        "coverUrl" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),await T._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Group_code_key" ON "Group"("code");'),await T._.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Bot" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "botId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "avatarUrl" TEXT,
        "role" TEXT NOT NULL DEFAULT 'Главный персонаж',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastPing" DATETIME,
        "groupId" TEXT,
        "model" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
        "temperature" REAL NOT NULL DEFAULT 0.7,
        "reasoningEnabled" BOOLEAN NOT NULL DEFAULT false,
        "legend" TEXT,
        "knowledge" TEXT,
        "secrets" TEXT,
        "character" TEXT,
        "triggers" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),await T._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Bot_botId_key" ON "Bot"("botId");'),await T._.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TelegramUser" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "telegramId" TEXT NOT NULL,
        "username" TEXT,
        "firstName" TEXT,
        "lastName" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastActive" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dialogueCount" INTEGER NOT NULL DEFAULT 0,
        "tokensUsed" INTEGER NOT NULL DEFAULT 0,
        "casesAccessed" TEXT DEFAULT '[]',
        "spentAmount" REAL NOT NULL DEFAULT 0.0
      );
    `),await T._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "TelegramUser_telegramId_key" ON "TelegramUser"("telegramId");'),await T._.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserDialogueLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "botId" TEXT NOT NULL,
        "userMessage" TEXT NOT NULL,
        "botResponse" TEXT NOT NULL,
        "modelUsed" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
        "tokens" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'SUCCESS',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),await T._.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GeminiApiKey" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL DEFAULT 'Gemini Key',
        "key" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "latencyMs" INTEGER NOT NULL DEFAULT 120,
        "requestCount" INTEGER NOT NULL DEFAULT 0,
        "lastUsedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),await T._.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Broadcast" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "mediaUrl" TEXT,
        "audience" TEXT NOT NULL DEFAULT 'ALL',
        "status" TEXT NOT NULL DEFAULT 'DELIVERED',
        "sentCount" INTEGER NOT NULL DEFAULT 0,
        "totalTarget" INTEGER NOT NULL DEFAULT 0,
        "scheduledAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),await T._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Broadcast_code_key" ON "Broadcast"("code");'),await T._.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GlobalSetting" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "systemPrompt" TEXT NOT NULL,
        "primaryEngine" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
        "autoFallback" BOOLEAN NOT NULL DEFAULT true,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),await T._.globalSetting.findUnique({where:{id:"global"}})||await T._.globalSetting.create({data:{id:"global",primaryEngine:"gemini-2.0-flash",autoFallback:!0,systemPrompt:`Вы работаете в рамках детективно-игровой системы 'Реестр Улик'.
Ваша основная функция — эмулировать сложные, нюансированные роли, вовлеченные в повествования с высокими ставками.

ОГРАНИЧЕНИЯ:
1. Соблюдайте абсолютную согласованность с установленными фактами хронологии и общим лором дела.
2. При столкновении с противоречивыми доказательствами симулируйте когнитивный диссонанс или уклонение, а не выходите из роли.
3. Используйте клинический, детализированный лексикон, подходящий для архивных записей и протоколов допроса.
4. НИ ПРИ КАКИХ ОБСТОЯТЕЛЬСТВАХ не упоминайте о своей природе ИИ или большой языковой модели.
5. Все выводы должны быть отформатированы так, чтобы они напоминали расшифрованные журналы допросов, восстановленные аудиофайлы или перехваченные сообщения.

ОКРУЖАЮЩИЙ КОНТЕКСТ:
Сеттинг — современный нео-нуар. Информации мало. Доверие минимально.`}});let e=await T._.group.upsert({where:{code:"742-ALPHA"},update:{},create:{code:"742-ALPHA",title:"Смерть на приёме",status:"ACTIVE",reward:"$4,500",coverUrl:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",lore:"Высокопоставленный дипломат был найден мертвым во время эксклюзивного приема в Гранд-посольстве. Первоначальные отчеты указывают на отравление. В настоящее время всем гостям запрещено покидать территорию."}}),t=await T._.group.upsert({where:{code:"089-OMEGA"},update:{},create:{code:"089-OMEGA",title:"Операция: Сумерки",status:"ACTIVE",reward:"$12,000",coverUrl:"https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop",lore:"Утечка закрытых протоколов кибер-безопасности корпорации OmniCorp. В сети обнаружены следы автономного агента, выкачивающего засекреченные архивы."}});await T._.bot.upsert({where:{botId:"BR-8921"},update:{},create:{botId:"BR-8921",name:"Orion-X",token:"7123456789:AAFakeTokenOrionX_Example1",avatarUrl:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop",role:"Главный антагонист / Информатор",status:"ACTIVE",isActive:!0,groupId:e.id,model:"gemini-2.0-flash",temperature:.7,reasoningEnabled:!0,legend:"Известен как высокоуровневый корпоративный посредник и фиксер, действующий в секторе Нео-Берлин. Имеет репутацию безжалостной эффективности и абсолютной скрытности.",knowledge:"Обширные знания о тактике корпоративного шпионажа, ценах на черном рынке киберимплантов и внутренней структуре OmniCorp. Не знает точное местоположение базы повстанцев.",secrets:'На самом деле является двойным агентом, работающим на Сопротивление. Раскрывает это только при предъявлении кодовой фразы "Crimson Dawn".',character:"Говорит короткими, четкими фразами. Корпоративный жаргон использует умеренно. Никогда не выказывает сомнений. Тон холодный, аналитический, слегка циничный.",triggers:'ЕСЛИ пользователь упоминает "Проект Икар" -> немедленно прекратить беседу и записать тревогу. ЕСЛИ предлагает кредиты -> вежливо отклонить, но зафиксировать попытку подкупа.'}}),await T._.bot.upsert({where:{botId:"BR-4432"},update:{},create:{botId:"BR-4432",name:"Oracle-7",token:"7123456789:AAFakeTokenOracle7_Example2",avatarUrl:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop",role:"Архивариус / Криминалист",status:"ACTIVE",isActive:!0,groupId:t.id,model:"gemini-2.0-flash",temperature:.4,reasoningEnabled:!1,legend:"Старший аналитик судебно-медицинской экспертизы.",knowledge:"Доступ к базе отпечатков пальцев, токсикологическим экспертизам.",character:"Говорит вежливо, методично, оперирует фактами и временными метками."}}),await T._.telegramUser.upsert({where:{telegramId:"98402911"},update:{},create:{telegramId:"98402911",username:"john_doe_99",firstName:"Джонатан",lastName:"Доу",status:"ACTIVE",dialogueCount:42,tokensUsed:14200,spentAmount:45,casesAccessed:JSON.stringify(["742-ALPHA","089-OMEGA"])}}),await T._.telegramUser.upsert({where:{telegramId:"11930422"},update:{},create:{telegramId:"11930422",username:"cipher_x",firstName:"Алиса",lastName:"Смит",status:"ACTIVE",dialogueCount:19,tokensUsed:6800,spentAmount:15,casesAccessed:JSON.stringify(["742-ALPHA"])}}),await T._.geminiApiKey.findFirst()||await T._.geminiApiKey.create({data:{name:"Gemini Primary (Default)",key:process.env.GEMINI_API_KEY||"AIzaSyDemoKey-SetYourOwnInSettings",status:"ACTIVE",latencyMs:135,requestCount:12}}),await T._.admin.upsert({where:{email:(process.env.ADMIN_EMAIL||"lasleywork").toLowerCase()},update:{},create:{email:(process.env.ADMIN_EMAIL||"lasleywork").toLowerCase(),name:"Главный следователь (Lasley)",passwordHash:process.env.ADMIN_PASSWORD||"Danyap0l4ndbot615!",clearanceLevel:4,role:"SUPERADMIN"}}),await T._.admin.upsert({where:{email:(process.env.SAINTROSE_EMAIL||"saintrose").toLowerCase()},update:{},create:{email:(process.env.SAINTROSE_EMAIL||"saintrose").toLowerCase(),name:"Следователь (SaintRose)",passwordHash:process.env.SAINTROSE_PASSWORD||"roserose123",clearanceLevel:4,role:"ADMIN"}}),r=!0}catch(e){console.error("Initial data seed error:",e)}}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),T=t.X(0,[276,840,972],()=>a(5798));module.exports=T})();