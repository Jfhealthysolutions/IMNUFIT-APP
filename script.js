import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence, updatePassword, sendPasswordResetEmail, signInWithCustomToken, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- 0. INYECCIÓN DE MANIFIESTO PWA ---
const manifest = {
    "name": "IMNUFIT Portal",
    "short_name": "IMNUFIT",
    "start_url": ".",
    "display": "standalone",
    "background_color": "#FBFBFC",
    "theme_color": "#FBFBFC",
    "icons": [{
        "src": "https://imnufit.com/wp-content/uploads/2026/01/IMG_8520.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "any maskable"
    }]
};
const blob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
const link = document.createElement('link');
link.rel = 'manifest';
link.href = URL.createObjectURL(blob);
document.head.appendChild(link);

// --- 1. CONFIGURACIÓN ---
const firebaseConfig = {
    apiKey: "AIzaSyAJBf7TbP1GuAoA3GsrCG0EJOifEt4YodY",
    authDomain: "imnufit-cad14.firebaseapp.com",
    projectId: "imnufit-cad14",
    storageBucket: "imnufit-cad14.firebasestorage.app",
    messagingSenderId: "65610345018",
    appId: "1:65610345018:web:eac15a30c72084faac6303"
};

const AIRTABLE_PAT = "patZ9QUQVyldn9zKC.afb4fc362eb2f79b1aa10faf3fb3268ea6bca3f57a1362b83f6cc8459a50f0d3"; 
const AIRTABLE_BASE_ID = "appCHcm7XPzeoyBCs"; 
const AIRTABLE_TABLE_NAME = "Pacientes"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'imnufit-official';

const _partA = "AIzaSyCPDuual8XB";
const _partB = "ejuVUPbKecfonbIh6SNolDk";
const apiKey = _partA + _partB;

// Variables Globales
const SPECIALIST_EMAIL = "imnufit@gmail.com";
let isSpecialistMode = false;
let specModeSelection = "sin_programa"; // Por defecto usa lo que diga Airtable
let aiCustomInstructions = ""; 
let cachedAirtableData = null;
let currentAppData = null; 
let chatHistory = [];
let notificationTimer = null;
let inactivityTimeout;
const INACTIVITY_LIMIT = 10 * 60 * 1000; 

// Variables para manejo de imágenes
let currentImageBase64 = null;
let currentImageMime = null;

const CALENDAR_LINK_DEFAULT = "https://calendar.app.google/CE4KjKxPeFiV93GV7";
const PLANES_LINK = "https://imnufit.com/planes-y-precios/";
const WHATSAPP_COMMUNITY_LINK = "https://chat.whatsapp.com/FNoToJXy8HO7iLVhPseQHB";

const PROGRAMAS_INFO = {
    "Adiós Diabetes 2": {
        img: "https://imnufit.com/wp-content/uploads/2024/04/Imagen-de-WhatsApp-2024-04-30-a-las-18.35.48_16bb1ed2.jpg",
        imgWidth: "w-48 md:w-56",
        meses: {
            1: [{ label: "Guía Nutricional - Mes 1", desc: "Desintoxicación", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-1-Nueva-Edicion.pdf", type: "PDF" }],
            2: [{ label: "Guía Nutricional - Mes 2", desc: "Control Glucémico", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-2-Nueva-Edicion.pdf", type: "PDF" }],
            3: [{ label: "Guía Nutricional - Mes 3", desc: "Mantenimiento", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-3-Nueva-Edicion.pdf", type: "PDF" }]
        }
    },
    "Quema Grasa": {
        img: "https://imnufit.com/wp-content/uploads/2022/04/qg.png",
        imgWidth: "w-36 md:w-40",
        monthTitles: { 1: "MES 1 - DEPURACIÓN", 2: "MES 2 - SACIEDAD", 3: "MES 3 - AYUNO INICIAL", 4: "MES 4 - AYUNO 16-18" },
        meses: {
            1: [
                { label: "Guía PDF Descargable", desc: "Objetivo: Eliminar comestibles dañinos.", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-1-Completo-Depuracion.pdf", type: "PDF" },
                { label: "Video Explicativo", desc: "Resúmen del mes.", url: "https://youtu.be/iO5ihFR8Vrg", type: "VIDEO" }
            ],
            2: [
                { label: "Guía PDF Descargable", desc: "Objetivo: Nutrición densa.", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-2-Completo-Saciedad.pdf", type: "PDF" },
                { label: "Video Explicativo", desc: "Resúmen del mes.", url: "https://youtu.be/AeIQAgoc0Fc", type: "VIDEO" }
            ],
            3: [
                { label: "Guía PDF Descargable", desc: "Objetivo: Ayuno natural.", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-3-Completo-Ayuno-Inicial.pdf", type: "PDF" },
                { label: "Video Explicativo", desc: "Resúmen del mes.", url: "https://youtu.be/CTevX300uG8", type: "VIDEO" }
            ],
            4: [
                { label: "Guía PDF Descargable", desc: "Objetivo: Ayuno prolongado.", url: "https://imnufit.com/wp-content/uploads/2025/12/Mes-4-Completo-Ayuno16-18.pdf", type: "PDF" },
                { label: "Video Explicativo", desc: "Resúmen del mes.", url: "https://youtu.be/15VyQaKcOU4", type: "VIDEO" }
            ]
        }
    },
    "SANO": { 
        img: "https://imnufit.com/wp-content/uploads/2023/11/Sano-logo-1-e1755541161822.png", 
        imgWidth: "w-32 md:w-36",
        meses: {
            1: [{ label: "Manual SANO - Mes 1", desc: "Alimentación Consciente", url: "https://imnufit.com/wp-content/uploads/2023/12/SANO-MES-1.pdf", type: "PDF" }],
            2: [{ label: "Manual SANO - Mes 2", desc: "Nuevos Hábitos", url: "https://imnufit.com/wp-content/uploads/2024/02/SANO-Mes-2.pdf", type: "PDF" }]
        }
    }
};

const frasesCreyentes = [
    "Todo lo puedo en Cristo que me fortalece. - Filipenses 4:13", 
    "Nuevas son sus misericordias cada mañana. - Lamentaciones 3:23", 
    "Jehová es mi pastor; nada me faltará. - Salmos 23:1",
    "Jehová es mi fortaleza y mi escudo. - Salmos 28:7", 
    "Fíate de Jehová de todo tu corazón. - Proverbios 3:5", 
    "Mira que te mando que te esfuerces y seas valiente. - Josué 1:9"
];

// --- 2. FUNCIONES DE UTILIDAD ---
window.safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
window.safeUpdate = (id, fn) => { const el = document.getElementById(id); if (el) fn(el); };

window.notify = (msg, type = 'error') => {
    const t = document.getElementById('notification-toast');
    const c = document.getElementById('notification-content');
    if (t && c) {
        if (notificationTimer) clearTimeout(notificationTimer);
        c.innerHTML = msg;
        const colorClass = type === 'success' ? 'text-emerald-600 border-emerald-100' : 'text-red-600 border-red-100';
        t.className = `fixed top-8 left-1/2 -translate-x-1/2 z-[9999] px-8 py-4 rounded-full shadow-2xl text-[13px] font-semibold bg-white border transform transition-all duration-300 ${colorClass}`;
        t.classList.remove('hidden', 'opacity-0', '-translate-y-10');
        t.classList.add('flex', 'opacity-100', 'translate-y-0');
        notificationTimer = setTimeout(() => {
            t.classList.remove('opacity-100', 'translate-y-0');
            t.classList.add('opacity-0', '-translate-y-10');
            setTimeout(() => { t.classList.add('hidden'); t.classList.remove('flex'); }, 300);
        }, 5000);
    } else { alert(msg); }
};

// --- OPTIMIZACIÓN: THROTTLE PARA INACTIVIDAD ---
let inactivityThrottle = false;
window.resetInactivityTimer = () => {
    if (inactivityThrottle) return;
    inactivityThrottle = true;
    setTimeout(() => { inactivityThrottle = false; }, 2000); 

    if (!auth.currentUser) return;
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
        window.notify("Sesión cerrada por inactividad", "error");
        window.cerrarSesion();
    }, INACTIVITY_LIMIT);
};

// Escuchar cambios de visibilidad para pausar animaciones (Cool Phone Mode)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.body.classList.add('paused-animations');
    } else {
        document.body.classList.remove('paused-animations');
    }
});

['mousemove', 'mousedown', 'click', 'scroll', 'keypress', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, window.resetInactivityTimer, { passive: true });
});

window.showView = (id, save = true) => {
    const views = ['login-view', 'signup-view', 'patient-view', 'membership-view', 'program-detail-view', 'forgot-password-view', 'contact-view', 'mobile-ai-view'];
    views.forEach(v => { const el = document.getElementById(v); if (el) el.classList.toggle('hidden', v !== id); });
    window.scrollTo(0, 0);
    if (save) history.pushState({ viewId: id }, "", "");
};

window.resetUI = () => {
    cachedAirtableData = null; currentAppData = null; chatHistory = []; isSpecialistMode = false;
    window.removeImage();
    window.safeSetText('display-nombre', "..."); window.safeSetText('display-estatus', "...");
    window.safeSetText('display-frase', "..."); window.safeSetText('plan-banner-title', "...");
    window.safeSetText('acc-nombre', "..."); window.safeSetText('acc-email', "--");
    window.safeSetText('acc-pais', "--"); window.safeSetText('acc-telefono', "--"); window.safeSetText('acc-nacimiento', "--");
    document.getElementById('specialist-panel')?.classList.add('hidden');
    document.getElementById('featured-plan-banner')?.classList.add('hidden');
    document.getElementById('restricted-banner')?.classList.add('hidden');
    document.getElementById('card-ai')?.classList.remove('hidden'); 
    window.clearChat();
    // AÑADIDO card-upload AL RESET
    ['card-entrenamientos', 'card-reporte', 'card-citas', 'card-consultas', 'card-community', 'card-install-app-main', 'card-upload'].forEach(id => { 
        document.getElementById(id)?.classList.add('hidden'); 
    });
    clearTimeout(inactivityTimeout);
};

window.formatDateMDY = (dateString) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 
    return `${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${date.getUTCFullYear()}`;
};

window.getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return { text: "Buenos días", icon: "☀️" };
    if (h >= 12 && h < 18) return { text: "Buenas tardes", icon: "☀️" };
    return { text: "Buenas noches", icon: "🌙" };
};

window.getStatusClass = (s) => {
    if (!s) return "bg-slate-50 text-slate-400 border-slate-100";
    const sl = String(s).toLowerCase();
    if (sl.includes("inactivo")) return "bg-rose-50 text-red-600 border-rose-200";
    if (sl.includes("activo") || sl.includes("actívo")) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    return "bg-amber-50 text-amber-600 border-amber-100";
};

window.getProgramKey = (p) => {
    if (!p) return null;
    const pl = p.toLowerCase();
    if (pl.includes("quema grasa")) return "Quema Grasa";
    if (pl.includes("sano")) return "SANO";
    if (pl.includes("adiós diabetes 2") || pl.includes("adios diabetes 2")) return "Adiós Diabetes 2";
    return null;
};

window.parseAIResponse = (text) => {
    if (!text) return "";
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-600">$1</em>');
    html = html.replace(/\[([^\]]+)\]\(function:([a-zA-Z0-9-]+)\)/g, `<button type="button" onclick="window.handleAIAction('$2')" class="mt-3 flex items-center gap-2 bg-[#2E4982]/10 text-[#2E4982] px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#2E4982] hover:text-white transition-all shadow-sm w-full md:w-auto justify-center md:justify-start"><span>$1</span></button>`);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, `<a href="$2" target="_blank" class="mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm w-full md:w-auto justify-center md:justify-start decoration-0"><span>$1</span></a>`);
    html = html.replace(/^\s*-\s+(.*)$/gm, '<li class="ml-4 list-disc marker:text-[#2E4982] pl-1 mb-1">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul class="my-2 space-y-1 text-left">$1</ul>');
    html = html.replace(/\n/g, '<br>');
    return html;
};

window.scrollToBottom = () => {
    const m = document.getElementById('ai-messages-mobile'), d = document.getElementById('ai-messages-desktop');
    if(m) m.scrollTop = m.scrollHeight; if(d) d.scrollTop = d.scrollHeight;
};

// --- FUNCIONES PARA IMÁGENES ---

window.handleImageSelect = (input) => {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                currentImageBase64 = dataUrl.split(',')[1];
                currentImageMime = "image/jpeg";

                const previews = document.querySelectorAll('.image-preview-container');
                previews.forEach(div => {
                    div.innerHTML = `
                        <div class="relative inline-block mt-2">
                            <img src="${dataUrl}" class="h-16 w-auto rounded-xl border border-slate-200 shadow-sm">
                            <button type="button" onclick="window.removeImage()" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l18 18"></path></svg>
                            </button>
                        </div>`;
                    div.classList.remove('hidden');
                });
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
};

window.removeImage = () => {
    currentImageBase64 = null;
    currentImageMime = null;
    const previews = document.querySelectorAll('.image-preview-container');
    previews.forEach(div => {
        div.innerHTML = '';
        div.classList.add('hidden');
    });
    document.querySelectorAll('input[type="file"]').forEach(i => i.value = '');
};

window.appendChatMessageToAll = (role, text, imageSrc = null) => {
    const content = role === 'ai' ? window.parseAIResponse(text) : text.replace(/\n/g, '<br>');
    
    let imageHtml = '';
    if (imageSrc) {
        imageHtml = `<div class="mb-2"><img src="${imageSrc}" class="max-w-[200px] max-h-[200px] rounded-xl border border-white/20 shadow-sm"></div>`;
    }

    const html = `
        <div class="flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-6 fade-in text-left">
            <div class="max-w-[85%] px-5 py-4 rounded-[1.4rem] text-[14px] leading-relaxed ${role === 'user' ? 'bg-[#2E4982] text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-600 rounded-tl-sm shadow-sm'}">
                ${imageHtml}
                ${content}
            </div>
        </div>`;
    
    const m = document.getElementById('ai-messages-mobile');
    const d = document.getElementById('ai-messages-desktop');
    if (m) {
        m.insertAdjacentHTML('beforeend', html);
        if(role === 'user') m.scrollTop = m.scrollHeight;
        else { const last = m.lastElementChild; if(last) requestAnimationFrame(() => last.scrollIntoView({behavior:'smooth', block:'start'})); }
    }
    if (d) {
        d.insertAdjacentHTML('beforeend', html);
        if(role === 'user') d.scrollTop = d.scrollHeight;
        else { const last = d.lastElementChild; if(last) requestAnimationFrame(() => last.scrollIntoView({behavior:'smooth', block:'start'})); }
    }
};

window.clearChat = () => {
    chatHistory = [];
    const info = currentAppData?.["Nombre + Edad"] || "Paciente";
    const welcome = `Hola <strong>${info.split(' ')[0]}</strong>, soy tu asistente personal. ¿En qué puedo guiarte hoy?`;
    const html = `<div class="flex justify-center mb-8"><p class="text-xs text-slate-400 font-medium uppercase tracking-widest">Hoy</p></div><div class="flex justify-start fade-in"><div class="max-w-[90%] bg-white border border-slate-100 px-6 py-4 rounded-[1.5rem] rounded-tl-sm text-[15px] leading-relaxed text-slate-600 shadow-sm">${welcome}</div></div>`;
    const m = document.getElementById('ai-messages-mobile'), d = document.getElementById('ai-messages-desktop');
    if(m) m.innerHTML = html; if(d) d.innerHTML = html;
};

window.handleAIAction = (viewId) => { window.closeDesktopAIModal(); if (viewId === 'program-detail-view') window.viewProgramResources(); else window.showView(viewId); };
window.openDesktopAIModal = () => { const m = document.getElementById('ai-modal-overlay'); if(m){ m.classList.remove('hidden'); m.classList.add('flex'); setTimeout(() => { m.classList.remove('opacity-0'); m.querySelector('div')?.classList.remove('scale-95', 'opacity-0'); document.getElementById('ai-input-desktop')?.focus(); }, 10); }};
window.closeDesktopAIModal = () => { const m = document.getElementById('ai-modal-overlay'); if(!m) return; m.classList.add('opacity-0'); m.querySelector('div')?.classList.add('scale-95', 'opacity-0'); setTimeout(() => { m.classList.add('hidden'); m.classList.remove('flex'); window.clearChat(); }, 300); };
window.openAIChat = () => { if (window.innerWidth < 768) { window.showView('mobile-ai-view'); setTimeout(() => document.getElementById('ai-input-mobile')?.focus(), 300); } else window.openDesktopAIModal(); };
window.closeMobileChat = () => { window.showView('patient-view'); window.clearChat(); };
window.openAITrainingModal = () => { document.getElementById('ai-training-modal')?.classList.remove('hidden'); document.getElementById('ai-training-modal')?.classList.add('flex'); };
window.closeAITrainingModal = () => { document.getElementById('ai-training-modal')?.classList.add('hidden'); };
window.updateSpecMode = (val) => { specModeSelection = val; window.refreshUIWithData(); window.showView('patient-view'); };

window.showInstallInstructions = () => {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /ipad|iphone|ipod/.test(ua) && !window.MSStream;
    const isAndroid = /android/.test(ua);
    const isMac = /macintosh|mac os x/.test(ua);
    const isChrome = /chrome/.test(ua) && !/edg/.test(ua);
    const isSafari = /safari/.test(ua) && !isChrome;
    const isChromeIOS = isIOS && /crios/.test(ua);
    
    let msg = "";
    let title = "";
    
    if (isIOS) {
        title = "iPhone / iPad";
        if (isChromeIOS) {
            msg = `
            <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">${title} (Chrome)</h3></div>
                <div class="text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 space-y-4">
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Busca el botón <strong>Compartir</strong> <svg class="w-4 h-4 inline text-[#2E4982] align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> arriba, al lado de la barra de dirección.</span>
                    </p>
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                        <span>Si no lo ves, toca los <strong>tres puntos (...)</strong> y busca "Añadir a pantalla de inicio".</span>
                    </p>
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                        <span>Confirma pulsando <strong>"Añadir"</strong>.</span>
                    </p>
                </div>
            </div>`;
        } else {
            msg = `
            <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">${title} (Safari)</h3></div>
                <ol class="text-sm text-slate-600 space-y-3 text-left bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <li class="flex gap-3"><span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0">1</span> <span>Toca el botón <strong>Compartir</strong> <svg class="w-4 h-4 inline text-[#2E4982] align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> <strong>abajo</strong> en la barra central.</span></li>
                    <li class="flex gap-3"><span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0">2</span> <span>Desliza hacia arriba y selecciona <strong>"Agregar a Inicio"</strong>.</span></li>
                </ol>
            </div>`;
        }
    } else if (isAndroid) {
        msg = `
         <div class="text-center space-y-6">
            <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
            <div><h3 class="text-xl font-bold text-slate-800">Android</h3></div>
            <ol class="text-sm text-slate-600 space-y-3 text-left bg-slate-50 p-5 rounded-2xl border border-slate-100">
                 <li class="flex gap-3"><span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0">1</span> <span>Toca el menú de opciones (los tres puntos <span class="font-bold">⋮</span>) arriba a la derecha.</span></li>
                 <li class="flex gap-3"><span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0">2</span> <span>Selecciona <strong>"Instalar aplicación"</strong> o "Añadir a pantalla de inicio".</span></li>
            </ol>
        </div>`;
    } else {
        if (isMac && isSafari) {
            msg = `
              <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">Mac (Safari)</h3></div>
                <div class="text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 space-y-4">
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Haz clic en el botón <strong>Compartir</strong> <svg class="w-4 h-4 inline text-[#2E4982] align-text-bottom" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> en la barra de herramientas superior.</span>
                    </p>
                    <p class="flex items-start gap-3">
                         <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                         <span>Selecciona <strong>"Agregar al Dock"</strong>.</span>
                    </p>
                </div>
            </div>`;
        } else if (isChrome) {
            msg = `
              <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">PC / Mac (Chrome)</h3></div>
                <div class="text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 space-y-4">
                    <p class="flex items-start gap-3">
                        <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <span>Haz clic en los <strong>tres puntos verticales (⋮)</strong> arriba a la derecha del navegador.</span>
                    </p>
                    <p class="flex items-start gap-3">
                         <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                         <span>Ve a <strong>"Guardar y compartir"</strong> (o "Transmitir, guardar y compartir").</span>
                    </p>
                    <p class="flex items-start gap-3">
                         <span class="bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                         <span>Haz clic en <strong>"Instalar página como aplicación..."</strong>.</span>
                    </p>
                </div>
            </div>`;
        } else {
              msg = `
              <div class="text-center space-y-6">
                <div class="bg-slate-50 p-4 rounded-3xl inline-block border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-[#2E4982]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                </div>
                <div><h3 class="text-xl font-bold text-slate-800">Instalar App</h3></div>
                <div class="text-left bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 space-y-4">
                    <p>Busca la opción <strong>"Instalar"</strong> o <strong>"Agregar a pantalla de inicio"</strong> en el menú de tu navegador.</p>
                </div>
            </div>`;
        }
    }

    const modal = document.getElementById('install-modal');
    const content = document.getElementById('install-modal-content');
    if(modal && content) {
        content.innerHTML = msg + `<button onclick="document.getElementById('install-modal').classList.add('hidden')" class="w-full bg-[#2E4982] text-white py-4 rounded-xl font-bold text-xs uppercase shadow-xl tracking-widest hover:scale-[1.02] transition-transform mt-6">Entendido</button>`;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.syncAIInstructions = async () => {
    if (!auth.currentUser) return;
    const aiDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'ai_config', 'instructions');
    onSnapshot(aiDocRef, (snap) => {
        const textEl = document.getElementById('ai-training-text');
        const infoEl = document.getElementById('ai-last-update');
        if (snap.exists()) {
            const data = snap.data();
            aiCustomInstructions = data.content || "";
            if(textEl && document.activeElement !== textEl) textEl.value = aiCustomInstructions;
            if(infoEl) {
                const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : "Desconocido";
                const user = data.updatedBy || "Sistema";
                infoEl.innerHTML = `Última modificación: <strong>${date}</strong><br>Por: ${user}`;
            }
        }
    }, (err) => console.log("AI Sync Active"));
};

window.saveAITraining = async () => {
    const text = document.getElementById('ai-training-text').value;
    const btn = document.getElementById('btn-save-ai-training');
    if (!auth.currentUser) return;
    btn.disabled = true; btn.textContent = "Guardando...";
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ai_config', 'instructions'), { 
            content: text, 
            updatedBy: auth.currentUser?.email, 
            timestamp: new Date() 
        });
        window.notify("Entrenamiento guardado", "success"); 
        window.closeAITrainingModal();
    } catch (e) { window.notify("Error al guardar"); }
    finally { btn.disabled = false; btn.textContent = "Guardar Cambios"; }
};

// --- MODIFICACIÓN DE REFRESH POTENTE (NUCLEAR RELOAD) ---
window.refreshData = () => { 
    const loader = document.getElementById('loading-screen');
    if(loader) loader.classList.remove('hidden');
    // Fuerza la recarga completa del navegador para traer cambios de código y datos
    window.location.reload();
};

async function fetchAirtableData(email) {
    const f = encodeURIComponent(`(LOWER({Email})=LOWER('${email}'))`), u = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=${f}`;
    try { const res = await fetch(u, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }); const data = await res.json(); return data.records?.[0]?.fields || null; } catch (e) { return null; }
}

function updateDashboardUI(data) {
    if (!data) return;
    currentAppData = data; 
    window.safeSetText('display-nombre', data["Nombre + Edad"] || "Usuario IMNUFIT");
    if (chatHistory.length === 0) window.clearChat();
    const g = window.getGreeting(); window.safeUpdate('display-greeting', (el) => el.innerHTML = `<span class="text-xl mr-2">${g.icon}</span> ${g.text}`);
    
    const st = data["Estatus"] || "Activo";
    window.safeUpdate('display-estatus', (el) => { el.textContent = st; el.className = `px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border inline-block mt-2 ${window.getStatusClass(st)}`; });
    
    document.getElementById('featured-plan-banner')?.classList.toggle('hidden', !data.Programa);
    if (data.Programa) window.safeSetText('plan-banner-title', data.Programa);
    
    // SHOW ALL CARDS
    ['card-entrenamientos', 'card-reporte', 'card-citas', 'card-consultas', 'card-community', 'card-install-app-main', 'card-upload'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.remove('hidden');
    });

    // LOGICA INTELIGENTE: Si la App ya está instalada, ocultamos el botón del main
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
        document.getElementById('card-install-app-main')?.classList.add('hidden');
    }

    // CHECK LINK CONSULTAS
    const linkCons = data["Link Consultas"];
    const cardCons = document.getElementById('card-consultas');
    if (cardCons) {
        if (!linkCons || linkCons.trim() === "") cardCons.classList.add('hidden');
        else {
            cardCons.classList.remove('hidden');
            const btn = document.getElementById('btn-consultas-action');
            if (btn) { btn.href = linkCons; btn.style.opacity = "1"; }
        }
    }

    window.safeUpdate('calendar-action-container', el => el.innerHTML = `<a href="${data["Link Calendar"] || CALENDAR_LINK_DEFAULT}" target="_blank" class="btn-ghost-sm text-center">Ir al Calendario</a>`);
    const bh = document.getElementById('btn-consultas-action'); if (bh) { bh.href = data["Link Consultas"] || "#"; bh.style.opacity = bh.href.includes("#") ? "0.4" : "1"; }
    
    window.safeSetText('acc-nombre', data["Nombre + Edad"] || "---"); window.safeSetText('acc-email', auth.currentUser?.email || "--"); window.safeSetText('display-frase', frasesCreyentes[Math.floor(Math.random() * frasesCreyentes.length)]);
    window.safeSetText('acc-pais', data["País"] || "--"); window.safeSetText('acc-telefono', data["Telefono"] || "--");
    window.safeSetText('acc-nacimiento', window.formatDateMDY(data["Fecha de Nacimiento"]));
    
    const genero = String(data["Género"] || "");
    window.safeUpdate('acc-genero', el => {
        el.textContent = genero;
        if (genero.toLowerCase().includes("masculino")) el.className = "px-4 py-1.5 rounded-full text-[10px] font-extrabold bg-sky-50 text-sky-600 border border-sky-100 uppercase tracking-widest inline-block shadow-sm";
        else if (genero.toLowerCase().includes("femenino")) el.className = "px-4 py-1.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-widest shadow-sm inline-block";
        else el.className = "hidden";
    });
}

// --- AUTH OBSERVER (GATEKEEPER BLINDADO) ---
onAuthStateChanged(auth, async (user) => {
    const loader = document.getElementById('loading-screen');
    if(loader) loader.classList.remove('hidden');
    if (user) {
        window.resetUI();
        window.resetInactivityTimer();
        isSpecialistMode = (user.email === SPECIALIST_EMAIL);
        const sp = document.getElementById('specialist-panel'); if(sp) sp.classList.toggle('hidden', !isSpecialistMode);
        
        // AHORA EL ADMIN TAMBIÉN BUSCA SUS DATOS
        cachedAirtableData = await fetchAirtableData(user.email);
        
        // REGLA DE ORO: SI NO EXISTE EN AIRTABLE -> FUERA (Solo para usuarios normales)
        // El admin NO es expulsado, pero si no tiene registro, cachedAirtableData será null
        if (!isSpecialistMode) {
            if (!cachedAirtableData) {
                window.notify("Usuario no encontrado en base de datos.");
                await signOut(auth);
                if(loader) loader.classList.add('hidden');
                return;
            }
            
            const status = String(cachedAirtableData["Estatus"] || "").toLowerCase();
            
            // REGLA ESTRICTA DE "INACTIVO"
            if (status.includes("inactivo")) {
                window.notify("Tu cuenta no está activa. Será activada en tu próxima consulta.");
                await signOut(auth);
                if(loader) loader.classList.add('hidden');
                return;
            }

            // REGLA DE "SOLO ACTIVO"
            if (!status.includes("activo") && !status.includes("actívo")) {
                window.notify("Tu cuenta no está activa. Será activada en tu próxima consulta.");
                await signOut(auth);
                if(loader) loader.classList.add('hidden');
                return;
            }
        }

        window.refreshUIWithData(); window.syncAIInstructions(); window.showView('patient-view', false);
    } else { 
        window.resetUI(); 
        const sp = document.getElementById('specialist-panel'); if(sp) sp.classList.add('hidden');
        isSpecialistMode = false; window.showView('login-view', false); 
    }
    if(loader) loader.classList.add('hidden');
});

// --- INIT ---
setPersistence(auth, browserLocalPersistence).then(() => {});
