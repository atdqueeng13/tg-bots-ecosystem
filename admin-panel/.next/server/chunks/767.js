exports.id=767,exports.ids=[767],exports.modules={4652:()=>{},7136:(e,t,a)=>{Promise.resolve().then(a.bind(a,8633))},7887:(e,t,a)=>{Promise.resolve().then(a.t.bind(a,2994,23)),Promise.resolve().then(a.t.bind(a,6114,23)),Promise.resolve().then(a.t.bind(a,9727,23)),Promise.resolve().then(a.t.bind(a,9671,23)),Promise.resolve().then(a.t.bind(a,1868,23)),Promise.resolve().then(a.t.bind(a,4759,23))},6968:(e,t,a)=>{"use strict";a.d(t,{Header:()=>s});var r=a(326);function s({title:e="Реестр Улик",badge:t,showSearch:a=!0}){return(0,r.jsxs)("header",{className:"fixed top-0 left-[280px] w-[calc(100%-280px)] h-16 flex justify-between items-center px-container-padding bg-surface border-b border-outline-variant z-30",children:[(0,r.jsxs)("div",{className:"flex items-center gap-4",children:[r.jsx("h2",{className:"font-headline-lg text-headline-lg font-bold text-primary",children:e}),t&&r.jsx("span",{className:"font-data-mono text-data-mono text-on-surface-variant bg-surface-container px-2 py-1 rounded text-xs border border-outline-variant",children:t})]}),(0,r.jsxs)("div",{className:"flex items-center gap-6",children:[a&&(0,r.jsxs)("div",{className:"relative group",children:[r.jsx("span",{className:"material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-secondary transition-colors text-[18px]",children:"search"}),r.jsx("input",{type:"text",placeholder:"Поиск по реестру...",className:"bg-surface-container-low border border-outline-variant focus:border-secondary focus:ring-1 focus:ring-secondary/50 rounded-lg text-on-surface font-body-md text-xs pl-9 pr-4 py-1.5 w-64 transition-all outline-none placeholder:text-on-surface-variant/60"})]}),(0,r.jsxs)("div",{className:"flex items-center gap-4 text-on-surface-variant",children:[(0,r.jsxs)("button",{title:"Уведомления",className:"hover:text-secondary transition-colors relative",children:[r.jsx("span",{className:"material-symbols-outlined text-[20px]",children:"notifications"}),r.jsx("span",{className:"absolute top-0 right-0 w-2 h-2 bg-error rounded-full"})]}),r.jsx("button",{title:"Поиск дел",className:"hover:text-secondary transition-colors",children:r.jsx("span",{className:"material-symbols-outlined text-[20px]",children:"manage_search"})}),r.jsx("button",{title:"История",className:"hover:text-secondary transition-colors",children:r.jsx("span",{className:"material-symbols-outlined text-[20px]",children:"history"})}),r.jsx("div",{className:"w-8 h-8 rounded-full border border-outline-variant bg-surface-container-highest flex items-center justify-center text-xs font-data-mono text-on-surface",children:"ID"})]})]})]})}},8633:(e,t,a)=>{"use strict";a.d(t,{Sidebar:()=>o});var r=a(326),s=a(434),n=a(5047);function o(){let e=(0,n.usePathname)(),t=(0,n.useRouter)(),a=async()=>{try{await fetch("/api/auth/logout",{method:"POST"})}catch(e){console.error(e)}t.push("/login")};return(0,r.jsxs)("nav",{className:"fixed h-screen w-[280px] left-0 top-0 border-r border-outline-variant bg-surface-container-low flex flex-col py-gutter z-40",children:[(0,r.jsxs)("div",{className:"px-container-padding mb-8",children:[r.jsx("h1",{className:"font-headline-lg text-headline-lg text-primary tracking-tighter",children:"Sherlock Admin"}),r.jsx("p",{className:"font-data-mono text-data-mono text-on-surface-variant mt-1 text-xs",children:"Дело: 742-ALPHA"})]}),r.jsx("div",{className:"flex-1 overflow-y-auto flex flex-col gap-1",children:[{href:"/",label:"Дашборд",icon:"dashboard"},{href:"/bots",label:"Боты",icon:"folder_shared"},{href:"/groups",label:"Группы",icon:"groups"},{href:"/users",label:"Пользователи",icon:"fingerprint"},{href:"/broadcasts",label:"Рассылки",icon:"record_voice_over"},{href:"/settings",label:"Настройки",icon:"settings"}].map(t=>{let a="/"===t.href?"/"===e:e.startsWith(t.href);return(0,r.jsxs)(s.default,{href:t.href,className:`flex items-center gap-3 py-3 transition-colors ${a?"text-secondary font-bold border-l-4 border-secondary pl-4 bg-surface-container-high":"text-on-surface-variant font-medium pl-5 hover:bg-surface-container-highest hover:text-on-surface"}`,children:[r.jsx("span",{className:"material-symbols-outlined text-[20px]",style:{fontVariationSettings:a?"'FILL' 1":"'FILL' 0"},children:t.icon}),r.jsx("span",{className:"font-title-md text-sm",children:t.label})]},t.href)})}),(0,r.jsxs)("div",{className:"px-container-padding mt-auto pt-4 border-t border-outline-variant",children:[(0,r.jsxs)("button",{onClick:a,className:"w-full flex items-center gap-3 py-2 text-on-surface-variant hover:text-error transition-colors",children:[r.jsx("span",{className:"material-symbols-outlined text-[20px]",children:"logout"}),r.jsx("span",{className:"font-title-md text-sm",children:"Выйти"})]}),(0,r.jsxs)("div",{className:"flex items-center gap-3 mt-4 pt-3 border-t border-outline-variant/40",children:[r.jsx("div",{className:"w-9 h-9 rounded-full border border-outline-variant bg-surface-container-highest flex items-center justify-center text-secondary font-data-mono text-xs",children:"SH"}),(0,r.jsxs)("div",{children:[r.jsx("p",{className:"font-title-md text-[13px] leading-tight text-on-surface font-semibold",children:"Главный следователь"}),r.jsx("p",{className:"font-data-mono text-[10px] text-on-surface-variant",children:"Уровень: 5 (ADMIN)"})]})]})]})]})}},3999:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>i});var r=a(9510),s=a(8585),n=a(9178);let o=(0,a(8570).createProxy)(String.raw`C:\game1\admin-panel\components\Sidebar.tsx#Sidebar`);async function i({children:e}){return await (0,n.Gg)()||(0,s.redirect)("/login"),(0,r.jsxs)("div",{className:"min-h-screen flex bg-background text-on-background",children:[r.jsx(o,{}),r.jsx("div",{className:"flex-1 ml-[280px] flex flex-col min-h-screen",children:e})]})}},1506:(e,t,a)=>{"use strict";a.r(t),a.d(t,{default:()=>n,metadata:()=>s});var r=a(9510);a(7272);let s={title:"Sherlock Admin — Реестр Улик",description:"Панель управления экосистемой Telegram-ботов с ИИ Google Gemini"};function n({children:e}){return(0,r.jsxs)("html",{lang:"ru",className:"dark",children:[(0,r.jsxs)("head",{children:[r.jsx("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),r.jsx("link",{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"})]}),r.jsx("body",{className:"bg-background text-on-background min-h-screen antialiased selection:bg-secondary selection:text-on-secondary",children:e})]})}},8009:(e,t,a)=>{"use strict";a.d(t,{h:()=>r});let r=(0,a(8570).createProxy)(String.raw`C:\game1\admin-panel\components\Header.tsx#Header`)},9178:(e,t,a)=>{"use strict";a.d(t,{Gg:()=>c,Z9:()=>d,ed:()=>l});var r=a(6091),s=a(6176),n=a(1615);let o=new TextEncoder().encode(process.env.JWT_SECRET||"sherlock-admin-secret-key-2026-very-secure-jwt-token-alpha"),i="sherlock_admin_token";async function l(e,t="Главный следователь"){return await new r.N({email:e,name:t,role:"admin"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("7d").sign(o)}async function T(e){try{return(await (0,s._)(e,o)).payload}catch{return null}}async function c(){let e=(0,n.cookies)(),t=e.get(i)?.value;return t?await T(t):null}async function d(e){let t=e.cookies.get(i)?.value;if(!t){let t=e.headers.get("Authorization");return t&&t.startsWith("Bearer ")?await T(t.substring(7)):null}return await T(t)}},2331:(e,t,a)=>{"use strict";a.d(t,{_:()=>s});var r=a(3524);let s=globalThis.prisma??new r.PrismaClient({log:["error"]})},2957:(e,t,a)=>{"use strict";a.d(t,{R:()=>n});var r=a(2331);let s=!1;async function n(){if(!s)try{await r._.$executeRawUnsafe(`
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
    `),await r._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");'),await r._.$executeRawUnsafe(`
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
    `),await r._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Group_code_key" ON "Group"("code");'),await r._.$executeRawUnsafe(`
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
    `),await r._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Bot_botId_key" ON "Bot"("botId");'),await r._.$executeRawUnsafe(`
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
    `),await r._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "TelegramUser_telegramId_key" ON "TelegramUser"("telegramId");'),await r._.$executeRawUnsafe(`
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
    `),await r._.$executeRawUnsafe(`
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
    `),await r._.$executeRawUnsafe(`
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
    `),await r._.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Broadcast_code_key" ON "Broadcast"("code");'),await r._.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "GlobalSetting" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "systemPrompt" TEXT NOT NULL,
        "primaryEngine" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
        "autoFallback" BOOLEAN NOT NULL DEFAULT true,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `),await r._.globalSetting.findUnique({where:{id:"global"}})||await r._.globalSetting.create({data:{id:"global",primaryEngine:"gemini-2.0-flash",autoFallback:!0,systemPrompt:`Вы работаете в рамках детективно-игровой системы 'Реестр Улик'.
Ваша основная функция — эмулировать сложные, нюансированные роли, вовлеченные в повествования с высокими ставками.

ОГРАНИЧЕНИЯ:
1. Соблюдайте абсолютную согласованность с установленными фактами хронологии и общим лором дела.
2. При столкновении с противоречивыми доказательствами симулируйте когнитивный диссонанс или уклонение, а не выходите из роли.
3. Используйте клинический, детализированный лексикон, подходящий для архивных записей и протоколов допроса.
4. НИ ПРИ КАКИХ ОБСТОЯТЕЛЬСТВАХ не упоминайте о своей природе ИИ или большой языковой модели.
5. Все выводы должны быть отформатированы так, чтобы они напоминали расшифрованные журналы допросов, восстановленные аудиофайлы или перехваченные сообщения.

ОКРУЖАЮЩИЙ КОНТЕКСТ:
Сеттинг — современный нео-нуар. Информации мало. Доверие минимально.`}});let e=await r._.group.upsert({where:{code:"742-ALPHA"},update:{},create:{code:"742-ALPHA",title:"Смерть на приёме",status:"ACTIVE",reward:"$4,500",coverUrl:"https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",lore:"Высокопоставленный дипломат был найден мертвым во время эксклюзивного приема в Гранд-посольстве. Первоначальные отчеты указывают на отравление. В настоящее время всем гостям запрещено покидать территорию."}}),t=await r._.group.upsert({where:{code:"089-OMEGA"},update:{},create:{code:"089-OMEGA",title:"Операция: Сумерки",status:"ACTIVE",reward:"$12,000",coverUrl:"https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop",lore:"Утечка закрытых протоколов кибер-безопасности корпорации OmniCorp. В сети обнаружены следы автономного агента, выкачивающего засекреченные архивы."}});await r._.bot.upsert({where:{botId:"BR-8921"},update:{},create:{botId:"BR-8921",name:"Orion-X",token:"7123456789:AAFakeTokenOrionX_Example1",avatarUrl:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop",role:"Главный антагонист / Информатор",status:"ACTIVE",isActive:!0,groupId:e.id,model:"gemini-2.0-flash",temperature:.7,reasoningEnabled:!0,legend:"Известен как высокоуровневый корпоративный посредник и фиксер, действующий в секторе Нео-Берлин. Имеет репутацию безжалостной эффективности и абсолютной скрытности.",knowledge:"Обширные знания о тактике корпоративного шпионажа, ценах на черном рынке киберимплантов и внутренней структуре OmniCorp. Не знает точное местоположение базы повстанцев.",secrets:'На самом деле является двойным агентом, работающим на Сопротивление. Раскрывает это только при предъявлении кодовой фразы "Crimson Dawn".',character:"Говорит короткими, четкими фразами. Корпоративный жаргон использует умеренно. Никогда не выказывает сомнений. Тон холодный, аналитический, слегка циничный.",triggers:'ЕСЛИ пользователь упоминает "Проект Икар" -> немедленно прекратить беседу и записать тревогу. ЕСЛИ предлагает кредиты -> вежливо отклонить, но зафиксировать попытку подкупа.'}}),await r._.bot.upsert({where:{botId:"BR-4432"},update:{},create:{botId:"BR-4432",name:"Oracle-7",token:"7123456789:AAFakeTokenOracle7_Example2",avatarUrl:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop",role:"Архивариус / Криминалист",status:"ACTIVE",isActive:!0,groupId:t.id,model:"gemini-2.0-flash",temperature:.4,reasoningEnabled:!1,legend:"Старший аналитик судебно-медицинской экспертизы.",knowledge:"Доступ к базе отпечатков пальцев, токсикологическим экспертизам.",character:"Говорит вежливо, методично, оперирует фактами и временными метками."}}),await r._.telegramUser.upsert({where:{telegramId:"98402911"},update:{},create:{telegramId:"98402911",username:"john_doe_99",firstName:"Джонатан",lastName:"Доу",status:"ACTIVE",dialogueCount:42,tokensUsed:14200,spentAmount:45,casesAccessed:JSON.stringify(["742-ALPHA","089-OMEGA"])}}),await r._.telegramUser.upsert({where:{telegramId:"11930422"},update:{},create:{telegramId:"11930422",username:"cipher_x",firstName:"Алиса",lastName:"Смит",status:"ACTIVE",dialogueCount:19,tokensUsed:6800,spentAmount:15,casesAccessed:JSON.stringify(["742-ALPHA"])}}),await r._.geminiApiKey.findFirst()||await r._.geminiApiKey.create({data:{name:"Gemini Primary (Default)",key:process.env.GEMINI_API_KEY||"AIzaSyDemoKey-SetYourOwnInSettings",status:"ACTIVE",latencyMs:135,requestCount:12}}),await r._.admin.upsert({where:{email:(process.env.ADMIN_EMAIL||"lasleywork").toLowerCase()},update:{},create:{email:(process.env.ADMIN_EMAIL||"lasleywork").toLowerCase(),name:"Главный следователь (Lasley)",passwordHash:process.env.ADMIN_PASSWORD||"Danyap0l4ndbot615!",clearanceLevel:4,role:"SUPERADMIN"}}),await r._.admin.upsert({where:{email:(process.env.SAINTROSE_EMAIL||"saintrose").toLowerCase()},update:{},create:{email:(process.env.SAINTROSE_EMAIL||"saintrose").toLowerCase(),name:"Следователь (SaintRose)",passwordHash:process.env.SAINTROSE_PASSWORD||"roserose123",clearanceLevel:4,role:"ADMIN"}}),s=!0}catch(e){console.error("Initial data seed error:",e)}}},7272:()=>{}};