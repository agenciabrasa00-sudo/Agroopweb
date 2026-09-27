// ---------------------------------------------------------------
// BACKEND REAL (Supabase) — cadastro/login de clientes
// ---------------------------------------------------------------
// Preencha as duas linhas abaixo com os dados do SEU projeto Supabase
// (Project Settings > API, no painel do supabase.com) para ativar o
// cadastro e login de verdade. Enquanto estiverem com os valores de
// exemplo, o app roda normalmente no modo demonstração (como hoje),
// sem pedir login.
const SUPABASE_CONFIG = {
  url: 'https://jgipowupbfzhqxlryads.supabase.co',
  anonKey: 'sb_publishable_x1V3yH5P4UX-RcfH5Ifl9A__a468Vcw',
};
const BACKEND_ENABLED = !!(
  SUPABASE_CONFIG.url && !SUPABASE_CONFIG.url.includes('COLE_AQUI') &&
  SUPABASE_CONFIG.anonKey && !SUPABASE_CONFIG.anonKey.includes('COLE_AQUI') &&
  window.supabase
);
const sb = BACKEND_ENABLED ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, { auth: { flowType: 'pkce' } }) : null;
// Info real exibida na tela "Sobre o AGROOP" (Mais > Sobre). Ajuste aqui
// quando a numeração de versão e a data de lançamento oficiais mudarem.
const AGROOP_VERSION = '1.0';
const AGROOP_LAUNCH_DATE = '14 jul 2026';
let currentAuthUser = null;
// Endereço público do app (usado pra montar o link de convite, e pra
// mandar o Supabase trazer a pessoa de volta pro lugar certo depois de
// confirmar o e-mail ou redefinir a senha). Antes era um endereço fixo
// digitado à mão — o problema real por trás do "confirmação de e-mail
// abre a conta errada": se o app tiver mais de um endereço publicado (ex:
// um antigo, de teste, e o de verdade que os clientes usam), um valor fixo
// aqui manda todo mundo sempre pro MESMO endereço, mesmo quem cadastrou
// pelo outro — daí a pessoa cai num navegador/sessão que não é a dela.
// window.location.origin resolve sozinho pro endereço que a pessoa está
// usando NA HORA, então cada uma sempre volta pro lugar certo.
const AGROOP_SITE_URL = window.location.origin;
// Dentro do app instalado (Android/iOS empacotado), o login com Google NÃO
// pode devolver pra um endereço "https://..." normal — isso abriria o
// navegador do aparelho e a pessoa ficaria presa lá, sem voltar pro app
// (foi exatamente o bug relatado). Um app nativo precisa de um endereço
// próprio, que só ele responde: registrado no AndroidManifest.xml e também
// liberado como "Redirect URL" no painel do Supabase.
const IS_NATIVE_APP = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const AGROOP_OAUTH_REDIRECT = IS_NATIVE_APP ? 'com.agroop://login-callback/' : AGROOP_SITE_URL;
// Se a pessoa abriu o app a partir de um link de convite (?invite=CODIGO),
// guarda o código pra processar assim que ela estiver logada.
let pendingInviteCode = new URLSearchParams(location.search).get('invite') || null;

// ---------------------------------------------------------------
// MODO DESKTOP — o app é o mesmo (mesmo código, mesmos dados), mas quando
// aberto numa tela larga (computador) troca pra um layout de painel
// profissional (menu lateral + barra superior + painel), em vez do layout
// de app de celular. O breakpoint aqui TEM que ser o mesmo valor do
// "@media (min-width: 1024px)" no style.css — os dois controlam a mesma
// mudança visual, um no CSS (esconder/mostrar) e outro aqui no JS (decidir
// se uma ação só faz sentido no celular, como o leitor de QR por câmera).
const DESKTOP_BREAKPOINT_MQ = '(min-width: 1024px)';
function isDesktopWide(){
  return !!(window.matchMedia && window.matchMedia(DESKTOP_BREAKPOINT_MQ).matches);
}

// ---------------------------------------------------------------
// ÍCONES (SVG próprios, no lugar de emojis) — mesmo estilo dos ícones
// já usados nos cartões de módulo (traço, sem preenchimento colorido).
// ---------------------------------------------------------------
const ICON_PATHS = {
  wheat: '<path d="M11 20A7 7 0 019.8 6.1C15.5 5 20 5.5 20 5.5s.5 4.5-.6 10.2A7 7 0 0111 20z"/><path d="M2 21c0-6 4-10 10-10"/>',
  cow: '<path d="M7 8c-1.5-1-2.5-3-1.5-4.5C6.5 2 8 3 8.5 5"/><path d="M17 8c1.5-1 2.5-3 1.5-4.5C17.5 2 16 3 15.5 5"/><path d="M5.5 9C4 9 3 10.3 3 11.8c0 1.2.8 2.2 2 2.5"/><path d="M18.5 9c1.5 0 2.5 1.3 2.5 2.8 0 1.2-.8 2.2-2 2.5"/><path d="M6.5 9.5c0-2.5 2.4-4.5 5.5-4.5s5.5 2 5.5 4.5c0 4-2 7.5-5.5 7.5s-5.5-3.5-5.5-7.5z"/>',
  // Ícones do clima (sol/lua/nuvem/chuva) usam cor própria fixa, sempre
  // com a mesma aparência em qualquer tema — não seguem "currentColor"
  // como o restante dos ícones do app.
  sun: '<path d="M12,5.4 A6.6,6.6 0 0,0 12,18.6 Z" fill="#FFD54F" stroke="none"/><path d="M12,5.4 A6.6,6.6 0 0,1 12,18.6 Z" fill="#FFA726" stroke="none"/><path d="M20.20 12.00L22.30 12.00" stroke="#FFA726" stroke-width="3.0"/><path d="M17.80 17.80L19.28 19.28" stroke="#FFA726" stroke-width="3.0"/><path d="M12.00 20.20L12.00 22.30" stroke="#FFD54F" stroke-width="3.0"/><path d="M6.20 17.80L4.72 19.28" stroke="#FFD54F" stroke-width="3.0"/><path d="M3.80 12.00L1.70 12.00" stroke="#FFD54F" stroke-width="3.0"/><path d="M6.20 6.20L4.72 4.72" stroke="#FFD54F" stroke-width="3.0"/><path d="M12.00 3.80L12.00 1.70" stroke="#FFD54F" stroke-width="3.0"/><path d="M17.80 6.20L19.28 4.72" stroke="#FFA726" stroke-width="3.0"/>',
  'cloud-sun': '<circle cx="8" cy="8" r="3.4" fill="#F5A623" stroke="#F5A623"/><path d="M8 2.5v1.3M4.4 4.4l.9.9M2.5 8h1.3" stroke="#F5A623"/><path d="M17 18a4 4 0 000-8 5 5 0 00-9.8 1.3A3.5 3.5 0 007.5 18H17z" fill="#EDEFEE" stroke="#AEB6BB"/>',
  cloud: '<path d="M17 18a4 4 0 000-8 5 5 0 00-9.8 1.3A3.5 3.5 0 007.5 18H17z" fill="#DCE1E4" stroke="#9AA5AB"/>',
  fog: '<path d="M4 8h13M4 12h16M6 16h13" stroke="#9AA5AB"/>',
  rain: '<path d="M16 13a4 4 0 000-8 5 5 0 00-9.8 1.3A3.5 3.5 0 006.5 13H16z" fill="#DCE1E4" stroke="#9AA5AB"/><path d="M8 16v2M12 16v2M16 16v2" stroke="#3E8EDE"/>',
  storm: '<path d="M16 11a4 4 0 000-8 5 5 0 00-9.8 1.3A3.5 3.5 0 006.5 11H16z" fill="#B9C2C9" stroke="#7C8790"/><path d="M11 14l-2 4h3l-2 4" stroke="#F5C518"/>',
  snow: '<path d="M16 11a4 4 0 000-8 5 5 0 00-9.8 1.3A3.5 3.5 0 006.5 11H16z" fill="#DCE1E4" stroke="#9AA5AB"/><path d="M9 16v.01M12 16v.01M15 16v.01M9 19v.01M12 19v.01M15 19v.01" stroke="#5AA9E6" stroke-width="2.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" fill="#EDE1B0" stroke="#5B6472"/>',
  // Fases reais da lua (o traço externo é sempre o disco cheio da lua, num
  // azul-noite; a parte clara mostra o quanto está iluminado em cada fase).
  'moon-new': '<circle cx="12" cy="12" r="9" fill="#232B3A" stroke="#5B6472"/>',
  'moon-waxing-crescent': '<circle cx="12" cy="12" r="9" fill="#232B3A" stroke="#5B6472"/><path d="M12,3 A9,9 0 0 1 12,21 A6.36,9 0 0 1 12,3 Z" fill="#EDE1B0" stroke="none"/>',
  'moon-first-quarter': '<circle cx="12" cy="12" r="9" fill="#232B3A" stroke="#5B6472"/><path d="M12,3 A9,9 0 0 1 12,21 A0,9 0 0 0 12,3 Z" fill="#EDE1B0" stroke="none"/>',
  'moon-waxing-gibbous': '<circle cx="12" cy="12" r="9" fill="#232B3A" stroke="#5B6472"/><path d="M12,3 A9,9 0 0 1 12,21 A6.36,9 0 0 0 12,3 Z" fill="#EDE1B0" stroke="none"/>',
  'moon-full': '<circle cx="12" cy="12" r="9" fill="#F4E6B8" stroke="#C9A94A"/>',
  'moon-waning-gibbous': '<circle cx="12" cy="12" r="9" fill="#232B3A" stroke="#5B6472"/><path d="M12,3 A9,9 0 0 0 12,21 A6.36,9 0 0 1 12,3 Z" fill="#EDE1B0" stroke="none"/>',
  'moon-last-quarter': '<circle cx="12" cy="12" r="9" fill="#232B3A" stroke="#5B6472"/><path d="M12,3 A9,9 0 0 0 12,21 A0,9 0 0 1 12,3 Z" fill="#EDE1B0" stroke="none"/>',
  'moon-waning-crescent': '<circle cx="12" cy="12" r="9" fill="#232B3A" stroke="#5B6472"/><path d="M12,3 A9,9 0 0 0 12,21 A6.36,9 0 0 0 12,3 Z" fill="#EDE1B0" stroke="none"/>',
  // Sol da manhã (nasce no horizonte) — diferente do "sun" (sol da tarde, já alto no céu).
  sunrise: '<path d="M4.8,17 A7.2,7.2 0 0,1 12,9.8 L12,17 Z" fill="#FFD54F" stroke="none"/><path d="M12,9.8 A7.2,7.2 0 0,1 19.2,17 L12,17 Z" fill="#FFA726" stroke="none"/><path d="M5.07 11.58L3.49 10.35" stroke="#FFD54F" stroke-width="2.4"/><path d="M8.14 9.09L7.27 7.29" stroke="#FFD54F" stroke-width="2.4"/><path d="M12.00 8.20L12.00 6.20" stroke="#FFD54F" stroke-width="2.4"/><path d="M15.86 9.09L16.73 7.29" stroke="#FFA726" stroke-width="2.4"/><path d="M18.93 11.58L20.51 10.35" stroke="#FFA726" stroke-width="2.4"/><path d="M2 17L22 17" stroke="#AEB6BB" stroke-width="2.6"/>',
  // Eclipse solar: o mesmo sol de raios, mas com o centro coberto (escuro).
  'eclipse-solar': '<circle cx="12" cy="12" r="4.4" fill="#181818" stroke="#181818"/><path d="M20.20 12.00L22.30 12.00" stroke="#F5A623" stroke-width="3.0"/><path d="M17.80 17.80L19.28 19.28" stroke="#F5A623" stroke-width="3.0"/><path d="M12.00 20.20L12.00 22.30" stroke="#F5A623" stroke-width="3.0"/><path d="M6.20 17.80L4.72 19.28" stroke="#F5A623" stroke-width="3.0"/><path d="M3.80 12.00L1.70 12.00" stroke="#F5A623" stroke-width="3.0"/><path d="M6.20 6.20L4.72 4.72" stroke="#F5A623" stroke-width="3.0"/><path d="M12.00 3.80L12.00 1.70" stroke="#F5A623" stroke-width="3.0"/><path d="M17.80 6.20L19.28 4.72" stroke="#F5A623" stroke-width="3.0"/>',
  // Lua de sangue (eclipse lunar total): vermelho fixo, bem diferente de qualquer outra fase.
  'eclipse-lunar-blood': '<circle cx="12" cy="12" r="9" fill="#B3261E" stroke="#7A1810"/>',
  alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M5 3L2 6M19 3l3 3"/>',
  unknown: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 014.8 1c0 1.5-2.3 2-2.3 3.5"/><path d="M12 17v.01"/>',
  tractor: '<circle cx="7" cy="17" r="2.2"/><circle cx="18" cy="17" r="2.8"/><path d="M4 17h1M9.5 17h5.3M7 17V9h6l3 3.5h2.3a1.7 1.7 0 011.7 1.7V17"/><path d="M9 9V6h2"/>',
  corn: '<rect x="9" y="3" width="6" height="14" rx="3"/><path d="M9 7h6M9 10h6M9 13h6"/><path d="M12 17v4"/>',
  syringe: '<path d="M18 2l4 4M17 3l-3.5 3.5M14.5 6.5L4 17l-1 4 4-1L17.5 9.5"/><path d="M8 13l3 3"/><path d="M10.5 10.5l3 3"/>',
  scale: '<path d="M12 3v18M7 7l-4 8a4 4 0 008 0l-4-8zM17 7l-4 8a4 4 0 008 0l-4-8z"/><path d="M5 21h14M7 7h10"/>',
  sprout: '<path d="M12 22v-7"/><path d="M12 15c0-4-3-6-7-6 0 4 3 7 7 7z"/><path d="M12 12c0-4 3-6 7-6 0 4-3 7-7 7z"/>',
  stethoscope: '<path d="M6 3v6a4 4 0 008 0V3"/><path d="M10 13v2a5 5 0 0010 0v-2.5"/><circle cx="20" cy="10" r="1.6"/>',
  cart: '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h2l2.4 12.2a2 2 0 002 1.8h9.2a2 2 0 002-1.6L21 8H6"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v9l9 5 9-5V8"/><path d="M12 13v9"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4a1 1 0 011-1h4a1 1 0 011 1v1H9V4z"/><path d="M9 11h6M9 15h6"/>',
  flask: '<path d="M9 3h6M10 3v5.5L5.5 17a2 2 0 001.8 3h9.4a2 2 0 001.8-3L14 8.5V3"/><path d="M8 15h8"/>',
  droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
  magnifier: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.6-4.6"/>',
  bottle: '<path d="M10 2h4v3.5l2 3V20a2 2 0 01-2 2h-4a2 2 0 01-2-2V8.5l2-3V2z"/><path d="M8 12h8"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  truck: '<rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l3 3.5V16h-7z"/><circle cx="6" cy="18" r="1.7"/><circle cx="17.5" cy="18" r="1.7"/>',
  'trend-down': '<path d="M3 7l7 7 4-4 7 7"/><path d="M21 12v5h-5"/>',
  warning: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 9v5M12 17v.01"/>',
  block: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9"/>',
  check: '<path d="M4 12.5l5 5L20 6"/>',
  dash: '<path d="M5 12h14"/>',
  eye: '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M3 3l18 18"/><path d="M10.6 5.2A10.7 10.7 0 0112 5c7 0 10.5 7 10.5 7a13.2 13.2 0 01-3.1 4M6.6 6.6C3.6 8.5 1.5 12 1.5 12s3.5 7 10.5 7a10.4 10.4 0 004.4-.9"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>',
  whatsapp: '<path d="M21 11.5a8.4 8.4 0 01-8.9 8.4 8.6 8.6 0 01-4-.9L3 20l1-4.8a8.4 8.4 0 1117-3.7z"/><path d="M8.5 10.3c0 3.1 2.6 5.7 5.7 5.7"/>',
  envelope: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  google: '<g transform="scale(1.333)" stroke="none"><path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.6154z"/><path fill="#34A853" d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3436 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"/><path fill="#FBBC05" d="M3.9641 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 000 9c0 1.4523.3477 2.8268.9573 4.0418L3.9641 10.71z"/><path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5814-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6564 3.5795 9 3.5795z"/></g>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  camera: '<path d="M4 8h3l2-2h6l2 2h3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V8z"/><circle cx="12" cy="13.5" r="3.5"/>',
  'map-pin': '<path d="M12 21s7-6.5 7-12a7 7 0 00-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.3"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.7"/><path d="M21 16l-5.5-5.5a2 2 0 00-2.8 0L4 19"/>',
  x: '<path d="M5 5l14 14M19 5L5 19"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>',
  qrcode: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3.2v3.2M20.5 14v2M14 20.5h3M20.5 17.5v3"/>',
  users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.3" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M15.2 14.6c2.7.5 4.8 2.7 4.8 5.4"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  // Ícones simples (sem cor fixa, seguem currentColor) usados no cartão
  // "Clima agora" do painel desktop — diferente dos ícones coloridos de
  // condição do tempo (sun/rain/cloud acima), que já têm cor própria.
  'cloud-rain-mono': '<path d="M17 16a4 4 0 000-8 5 5 0 00-9.8 1.3A3.5 3.5 0 007.5 16H17z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  'wind-mono': '<path d="M2 8h11a2.5 2.5 0 10-2.4-3.2"/><path d="M2 13h15a2.6 2.6 0 11-2.5 3.3"/><path d="M2 18h8a2 2 0 10-1.8-2.8"/>',
};
// Devolve o SVG do ícone `name` (ver ICON_PATHS). `opts.size` define a
// largura/altura em px (padrão 16) e `opts.style` acrescenta CSS extra.
function svgIcon(name, opts){
  opts = opts || {};
  const size = opts.size || 16;
  const path = ICON_PATHS[name];
  if(!path) return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none;${opts.style||''}">${path}</svg>`;
}
// Mapa de emojis (usados nos dados do app) para os ícones SVG próprios.
const EMOJI_ICON_MAP = {
  '🌾':'wheat', '🐄':'cow', '🐂':'cow',
  '☀️':'sun', '🌅':'sunrise', '🌤️':'cloud-sun', '⛅':'cloud-sun', '☁️':'cloud',
  '🌫️':'fog', '🌦️':'rain', '🌧️':'rain', '⛈️':'storm', '❄️':'snow', '🌙':'moon', '❔':'unknown',
  // Fases da lua e eclipses (ver celestialIconForDate/moonPhaseIcon).
  '🌑':'moon-new', '🌒':'moon-waxing-crescent', '🌓':'moon-first-quarter', '🌔':'moon-waxing-gibbous',
  '🌕':'moon-full', '🌖':'moon-waning-gibbous', '🌗':'moon-last-quarter', '🌘':'moon-waning-crescent',
  'eclipse-solar':'eclipse-solar', 'eclipse-lunar-blood':'eclipse-lunar-blood',
  '🚜':'tractor', '🌽':'corn', '💉':'syringe', '⚖️':'scale', '🌱':'sprout',
  '🩺':'stethoscope', '🛒':'cart', '📦':'box', '📋':'clipboard', '🧪':'flask',
  '💧':'droplet', '🔍':'magnifier', '🧴':'bottle', '🔧':'wrench', '🚛':'truck',
  '📉':'trend-down', '⚠️':'warning', '⚠':'warning', '⛔':'block', '⏰':'alarm',
  '✅':'check-circle', '✓':'check', '—':'dash',
};
// Devolve o ícone SVG correspondente ao emoji `ch` (usado nos dados do
// app). Se não houver um ícone próprio mapeado, devolve o emoji original
// como fallback (nunca quebra a tela).
function emojiIcon(ch, opts){
  const name = EMOJI_ICON_MAP[ch];
  return name ? svgIcon(name, opts) : (ch || '');
}

// ---------------------------------------------------------------
// DATA (fictício, apenas para o protótipo)
// ---------------------------------------------------------------
const farms = {
  santafe: {
    id:'santafe', name:'Fazenda Santa Fé', city:'Sorriso', state:'MT', type:'agro',
    color:'var(--agro)', icon:'🌾', area:'860 ha', coords:'-12.5433, -55.7211',
    team:['Luiz Henrique — Proprietário','Marcos Lima — Encarregado agrícola'],
    weather:{temp:31, cond:'Parcialmente nublado', icon:'⛅', updated:'07:40', rain:20},
    talhoes:[
      {id:'t1', name:'Talhão 3 — Soja', area:120, cultura:'Soja', variedade:'TMG 7062', safra:'2025/26', stage:'Floração',
        dataPlantio:'2025-11-05', previsaoColheita:'2026-03-10', operationType:'Pulverização', status:'favoravel',
        reason:'Sem chuva prevista nas próximas 48h e umidade do solo adequada para a pulverização agendada.',
        nextWindow:null, activity:'Pulverização — 16 ago, 07:00', responsible:'Marcos Lima', updated:'07:40',
        pestLog:[{d:'2026-08-10', praga:'Lagarta-da-soja', nivel:'Baixo', obs:'Monitoramento de rotina, sem necessidade de aplicação.', nextInspection:'2026-08-24'}],
        applications:[{d:'2026-07-28', produto:'Fungicida Azoxistrobina', talhaoArea:120}],
        cropHistory:[{safra:'2024/25', cultura:'Milho', variedade:'AG 8088', yield:'112 sc/ha'},{safra:'2023/24', cultura:'Soja', variedade:'TMG 7062', yield:'58 sc/ha'}]},
      {id:'t2', name:'Talhão 5 — Soja', area:95, cultura:'Soja', variedade:'TMG 7062', safra:'2025/26', stage:'Enchimento de grãos',
        dataPlantio:'2025-11-10', previsaoColheita:'2026-03-15', operationType:'Pulverização', status:'atencao',
        reason:'Chuva prevista para o período da manhã pode prejudicar a pulverização agendada para hoje.',
        nextWindow:'17 de agosto, a partir das 14h', activity:'Pulverização — 16 ago, 08:00', responsible:'Marcos Lima', updated:'07:40', pestLog:[], applications:[],
        cropHistory:[{safra:'2024/25', cultura:'Soja', variedade:'TMG 7062', yield:'55 sc/ha'}]},
      {id:'t3', name:'Talhão 1 — Milho safrinha', area:150, cultura:'Milho', variedade:'AG 8088', safra:'2026 (safrinha)', stage:'Colheita',
        dataPlantio:'2026-02-20', previsaoColheita:'2026-08-20', operationType:'Colheita', status:'desfavoravel',
        reason:'Umidade do grão acima do ideal após a chuva registrada nas últimas 24h.',
        nextWindow:'18 de agosto, se não houver novas chuvas', activity:'Colheita — 16 ago', responsible:'Equipe de campo', updated:'07:20', pestLog:[], applications:[], actualYield:null,
        cropHistory:[{safra:'2025/26', cultura:'Soja', variedade:'TMG 7062', yield:'56 sc/ha'},{safra:'2024/25', cultura:'Milho', variedade:'AG 8088', yield:'118 sc/ha'}]},
      {id:'t4', name:'Talhão 7 — Área em pousio', area:80, cultura:'—', variedade:'—', safra:'—', stage:'—',
        dataPlantio:null, previsaoColheita:null, operationType:null, status:'dados',
        reason:'Não há estação meteorológica cadastrada próxima a este talhão.',
        nextWindow:null, activity:'—', responsible:'—', updated:'—', pestLog:[], applications:[], cropHistory:[]},
      {id:'t6', name:'Talhão 9 — Soja (safra 26/27)', area:110, cultura:'Soja', variedade:'NS 7667', safra:'2026/27', stage:'Pré-plantio',
        dataPlantio:null, previsaoColheita:null, operationType:'Plantio', status:'atencao',
        reason:'Volume de chuva ainda insuficiente nos últimos dias para garantir boa umidade de plantio.',
        nextWindow:'Consulte a previsão dos próximos dias', activity:'Plantio — 25 ago', responsible:'Marcos Lima', updated:'07:40', pestLog:[], applications:[],
        cropHistory:[{safra:'2025/26', cultura:'Soja', variedade:'TMG 7062', yield:'52 sc/ha'}]},
      {id:'t7', name:'Talhão 12 — Algodão', area:75, cultura:'Algodão', variedade:'FM 985', safra:'2025/26', stage:'Maturação',
        dataPlantio:'2025-12-01', previsaoColheita:'2026-08-25', operationType:'Colheita', status:'atencao',
        reason:'Umidade da fibra ainda um pouco acima do ideal — recomendável aguardar mais 2 a 3 dias de sol antes de colher.',
        nextWindow:'19 de agosto, se o tempo seco se mantiver', activity:'Colheita — 26 ago', responsible:'Marcos Lima', updated:'07:40', pestLog:[], applications:[], actualYield:null,
        cropHistory:[{safra:'2024/25', cultura:'Soja', variedade:'TMG 7062', yield:'53 sc/ha'}]},
    ],
    inputs:[
      {id:'in1', name:'Semente de soja TMG 7062', type:'Sementes', stock:180, unit:'sacos', costPerUnit:420, minStock:60, lote:'L2026-04', validade:'2027-06-01'},
      {id:'in2', name:'Fertilizante NPK 08-20-18', type:'Fertilizantes', stock:12, unit:'toneladas', costPerUnit:3200, minStock:15, lote:'F2026-11', validade:null},
      {id:'in3', name:'Herbicida Glifosato', type:'Defensivos', stock:340, unit:'litros', costPerUnit:28, minStock:100, lote:'D2026-07', validade:'2028-01-01'},
      {id:'in4', name:'Diesel S10', type:'Combustíveis', stock:2200, unit:'litros', costPerUnit:6.1, minStock:1000, lote:'—', validade:null},
    ],
    machines:[
      {id:'mq1', name:'Trator John Deere 6120', type:'Trator', horimetro:1840, fuelPerHour:14, costPerHour:180, lastMaintenance:'2026-06-01', nextMaintenanceHour:2000},
      {id:'mq2', name:'Pulverizador autopropelido', type:'Pulverizador', horimetro:620, fuelPerHour:22, costPerHour:260, lastMaintenance:'2026-07-10', nextMaintenanceHour:700},
      {id:'mq3', name:'Colheitadeira Case 8250', type:'Colheitadeira', horimetro:410, fuelPerHour:38, costPerHour:520, lastMaintenance:'2026-05-15', nextMaintenanceHour:500},
    ],
    lotes:[], animals:[],
  },
  boaesperanca:{
    id:'boaesperanca', name:'Fazenda Boa Esperança', city:'Barretos', state:'SP', type:'pec',
    color:'var(--pec)', icon:'🐄', area:'540 ha', coords:'-20.5572, -48.5686',
    team:['Luiz Henrique — Proprietário','Dra. Ana Souza — Veterinária'],
    weather:{temp:27, cond:'Ensolarado', icon:'☀️', updated:'07:38', rain:5},
    talhoes:[],
    lotes:[
      {id:'l1', name:'Lote 2 — Cria', category:'Vacas', qty:128, pasture:'Pasto Norte'},
      {id:'l2', name:'Lote 4 — Recria', category:'Novilhas', qty:64, pasture:'Pasto Sul'},
      {id:'l3', name:'Lote 5 — Engorda', category:'Bois', qty:96, pasture:'Pasto Leste'},
    ],
    pastures:[
      {id:'p1', name:'Pasto Norte', area:80, capacity:150, status:'Em uso', enteredDate:'2026-06-01'},
      {id:'p2', name:'Pasto Sul', area:60, capacity:90, status:'Em uso', enteredDate:'2026-07-10'},
      {id:'p3', name:'Pasto Leste', area:70, capacity:110, status:'Em uso', enteredDate:'2026-05-15'},
      {id:'p4', name:'Pasto Oeste', area:50, capacity:80, status:'Descanso', enteredDate:'2026-08-01'},
    ],
    feed:[
      {id:'f1', name:'Sal mineral', type:'Mineral', stock:340, unit:'kg', costPerUnit:4.2, minStock:100},
      {id:'f2', name:'Ração de recria 18%', type:'Ração', stock:60, unit:'sacos', costPerUnit:98, minStock:80},
      {id:'f3', name:'Suplemento proteico', type:'Suplemento', stock:25, unit:'sacos', costPerUnit:120, minStock:30},
    ],
    animals:[
      {id:'a1', brinco:'BR 0231', eletronicId:'982 000 123 456 781', name:'—', breed:'Nelore', sex:'Fêmea', category:'Vaca',
        birth:'2022-03-12', weight:412, targetWeight:430, situation:'Gestante (7 meses)', statusPlantel:'Ativo', milkStatus:'—',
        mother:'BR 0110', father:'Touro Sansão',
        lot:'Lote 2 — Cria', pastureId:'p1', photo:'🐄', nextVaccine:'2026-08-22', production:null,
        history:[
          {d:'2026-08-02', t:'Pesagem', v:'412 kg', meta:{weight:412}},
          {d:'2026-07-18', t:'Diagnóstico de gestação', v:'Positivo · previsão de parto em 15/10', meta:{result:'Positivo', dueDate:'2026-10-15'}},
          {d:'2026-06-05', t:'Vacina', v:'Aftosa aplicada', meta:{product:'Aftosa'}},
          {d:'2026-05-20', t:'Movimentação', v:'Lote 1 → Lote 2 · Pasto Norte', meta:{toLot:'Lote 2 — Cria', toPasture:'Pasto Norte'}},
        ]},
      {id:'a2', brinco:'BR 0198', eletronicId:'982 000 123 456 782', name:'—', breed:'Nelore', sex:'Macho', category:'Novilho',
        birth:'2023-11-02', weight:298, targetWeight:340, situation:'Em recria', statusPlantel:'Ativo', milkStatus:'—',
        mother:'BR 0087', father:'Touro Sansão',
        lot:'Lote 4 — Recria', pastureId:'p2', photo:'🐂', nextVaccine:'2026-08-25', production:null,
        history:[
          {d:'2026-07-30', t:'Pesagem', v:'298 kg', meta:{weight:298}},
          {d:'2026-07-01', t:'Pesagem', v:'276 kg', meta:{weight:276}},
          {d:'2026-06-10', t:'Vacina', v:'Clostridiose aplicada', meta:{product:'Clostridiose'}},
        ]},
      {id:'a4', brinco:'BR 0342', eletronicId:'982 000 123 456 784', name:'—', breed:'Nelore', sex:'Macho', category:'Boi',
        birth:'2023-02-10', weight:410, targetWeight:480, situation:'Em engorda', statusPlantel:'Ativo', milkStatus:'—',
        mother:'—', father:'—',
        lot:'Lote 5 — Engorda', pastureId:'p3', photo:'🐂', nextVaccine:'2026-08-05', production:null,
        history:[
          {d:'2026-08-01', t:'Pesagem', v:'410 kg', meta:{weight:410}},
          {d:'2026-07-01', t:'Pesagem', v:'395 kg', meta:{weight:395}},
          {d:'2026-06-20', t:'Vermífugo', v:'Ivermectina aplicada', meta:{product:'Ivermectina', nextDate:'2026-08-05'}},
        ]},
    ],
  },
  tresirmaos:{
    id:'tresirmaos', name:'Sítio Três Irmãos', city:'Uberlândia', state:'MG', type:'mista',
    color:'var(--sky)', icon:'🌤️', area:'210 ha', coords:'-18.9186, -48.2772',
    team:['Luiz Henrique — Proprietário'],
    weather:{temp:22, cond:'Chuva prevista à tarde', icon:'🌧️', updated:'07:35', rain:70},
    talhoes:[
      {id:'t5', name:'Talhão 2 — Milho', area:40, cultura:'Milho', variedade:'AG 8088', safra:'2025/26', stage:'Vegetativo',
        dataPlantio:'2026-07-20', previsaoColheita:'2026-11-15', operationType:'Plantio', status:'favoravel',
        reason:'Chuva prevista favorece o desenvolvimento da cultura; nenhuma operação de campo agendada para hoje.',
        nextWindow:null, activity:'Adubação — 19 ago', responsible:'Luiz Henrique', updated:'07:35', pestLog:[], applications:[],
        cropHistory:[{safra:'2024/25', cultura:'Soja', variedade:'TMG 7062', yield:'50 sc/ha'}]},
    ],
    inputs:[
      {id:'in5', name:'Adubo de cobertura Ureia', type:'Fertilizantes', stock:8, unit:'toneladas', costPerUnit:3400, minStock:5, lote:'F2026-08', validade:null},
    ],
    machines:[
      {id:'mq4', name:'Trator Massey Ferguson 4275', type:'Trator', horimetro:2210, fuelPerHour:11, costPerHour:150, lastMaintenance:'2026-04-20', nextMaintenanceHour:2300},
    ],
    lotes:[
      {id:'l4', name:'Lote 1 — Leiteiro', category:'Vacas leiteiras', qty:22, pasture:'Curral'},
    ],
    pastures:[
      {id:'p5', name:'Curral', area:8, capacity:30, status:'Em uso', enteredDate:'2026-04-01'},
    ],
    feed:[
      {id:'f4', name:'Ração de lactação', type:'Ração', stock:18, unit:'sacos', costPerUnit:105, minStock:20},
    ],
    animals:[
      {id:'a3', brinco:'BR 0055', eletronicId:'982 000 123 456 783', name:'Mimosa', breed:'Girolando', sex:'Fêmea', category:'Vaca',
        birth:'2021-01-05', weight:480, targetWeight:460, situation:'Lactante', statusPlantel:'Ativo', milkStatus:'Lactante',
        mother:'—', father:'—',
        lot:'Lote 1 — Leiteiro', pastureId:'p5', photo:'🐄', nextVaccine:null, production:24,
        history:[
          {d:'2026-08-15', t:'Produção', v:'24 L/dia', meta:{liters:24}},
          {d:'2026-08-14', t:'Produção', v:'25 L/dia', meta:{liters:25}},
          {d:'2026-08-13', t:'Produção', v:'26 L/dia', meta:{liters:26}},
          {d:'2026-08-12', t:'Produção', v:'23 L/dia', meta:{liters:23}},
          {d:'2026-08-11', t:'Produção', v:'25 L/dia', meta:{liters:25}},
          {d:'2026-08-10', t:'Produção', v:'26 L/dia', meta:{liters:26}},
          {d:'2026-08-09', t:'Produção', v:'27 L/dia', meta:{liters:27}},
          {d:'2026-08-08', t:'Produção', v:'27 L/dia', meta:{liters:27}},
          {d:'2026-08-01', t:'Pesagem', v:'480 kg', meta:{weight:480}},
          {d:'2026-06-22', t:'Vacina', v:'Brucelose aplicada', meta:{product:'Brucelose'}},
        ]},
      {id:'a6', brinco:'BR 0071', eletronicId:'982 000 123 456 786', name:'Estrela', breed:'Girolando', sex:'Fêmea', category:'Vaca',
        birth:'2020-09-18', weight:465, targetWeight:450, situation:'Lactante', statusPlantel:'Ativo', milkStatus:'Lactante',
        mother:'—', father:'—',
        lot:'Lote 1 — Leiteiro', pastureId:'p5', photo:'🐄', nextVaccine:'2026-09-02', production:18,
        history:[
          {d:'2026-08-15', t:'Produção', v:'18 L/dia', meta:{liters:18}},
          {d:'2026-08-14', t:'Produção', v:'19 L/dia', meta:{liters:19}},
          {d:'2026-08-13', t:'Produção', v:'19 L/dia', meta:{liters:19}},
          {d:'2026-08-12', t:'Produção', v:'20 L/dia', meta:{liters:20}},
          {d:'2026-08-11', t:'Produção', v:'18 L/dia', meta:{liters:18}},
          {d:'2026-08-10', t:'Produção', v:'17 L/dia', meta:{liters:17}},
          {d:'2026-08-09', t:'Produção', v:'19 L/dia', meta:{liters:19}},
          {d:'2026-08-08', t:'Produção', v:'20 L/dia', meta:{liters:20}},
        ]},
    ],
  },
};

const activities = [
  {id:'act1', farm:'santafe', title:'Pulverização — Talhão 5', type:'agro', icon:'🚜', when:'Hoje, 08:00', bucket:'hoje', status:'atencao', responsible:'Marcos Lima', talhaoId:'t2'},
  {id:'act2', farm:'santafe', title:'Colheita — Talhão 1', type:'agro', icon:'🌽', when:'Hoje, o dia todo', bucket:'hoje', status:'desfavoravel', responsible:'Equipe de campo', talhaoId:'t3'},
  {id:'act3', farm:'boaesperanca', title:'Vacinação — Lote 2 (Cria)', type:'pec', icon:'💉', when:'Atrasada — 13 ago', bucket:'atrasadas', status:null, responsible:'Dra. Ana Souza'},
  {id:'act4', farm:'boaesperanca', title:'Pesagem — Lote 4 (Recria)', type:'pec', icon:'⚖️', when:'Amanhã, 07:00', bucket:'proximas', status:null, responsible:'Equipe do curral'},
  {id:'act5', farm:'tresirmaos', title:'Adubação — Talhão 2', type:'agro', icon:'🌱', when:'19 ago', bucket:'proximas', status:'favoravel', responsible:'Luiz Henrique', talhaoId:'t5'},
  {id:'act6', farm:'santafe', title:'Pulverização — Talhão 3', type:'agro', icon:'🚜', when:'Concluída — 14 ago', bucket:'concluidas', status:'concluida', responsible:'Marcos Lima', talhaoId:'t1'},
  {id:'act7', farm:'boaesperanca', title:'Diagnóstico de gestação — Lote 2', type:'pec', icon:'🩺', when:'Concluída — 18 jul', bucket:'concluidas', status:'concluida', responsible:'Dra. Ana Souza'},
  {id:'act8', farm:'santafe', title:'Compra de fertilizante NPK', type:'compras', icon:'🛒', when:'20 ago', bucket:'proximas', status:null, responsible:'Luiz Henrique'},
  {id:'act9', farm:'santafe', title:'Entrega de soja — Cooperativa Sorriso', type:'entregas', icon:'📦', when:'22 ago', bucket:'proximas', status:null, responsible:'Equipe de campo'},
];

const NOTIF_CATEGORIES = ['Clima','Agricultura','Pecuária','Estoque','Manutenção','Atividades atrasadas','Riscos operacionais'];
let notifications = [
  {id:'n1', farm:'santafe', icon:'⚠️', title:'Chuva pode atrasar a pulverização', body:'Luiz, no Talhão 5 da Fazenda Santa Fé a pulverização agendada para hoje às 08:00 pode ser prejudicada — chuva prevista para o período da manhã.', time:'07:40', category:'Clima', priority:'Alta', target:{screen:'condition', farm:'santafe', talhao:'t2'}},
  {id:'n2', farm:'santafe', icon:'⛔', title:'Colheita em condição desfavorável', body:'O Talhão 1 está com umidade do grão acima do ideal após a chuva das últimas 24h. Próxima janela prevista: 18 de agosto.', time:'07:20', category:'Agricultura', priority:'Alta', target:{screen:'condition', farm:'santafe', talhao:'t3'}},
  {id:'n3', farm:'boaesperanca', icon:'⏰', title:'Vacinação atrasada — Lote 2', body:'A vacinação do Lote 2 — Cria está atrasada desde 13 de agosto. Responsável: Dra. Ana Souza.', time:'Ontem', category:'Atividades atrasadas', priority:'Média', target:{screen:'activities'}},
  {id:'n4', farm:'tresirmaos', icon:'✅', title:'Condição favorável para adubação', body:'O Talhão 2 do Sítio Três Irmãos segue em condição favorável para a adubação agendada em 19 de agosto.', time:'06:55', category:'Agricultura', priority:'Baixa', target:{screen:'condition', farm:'tresirmaos', talhao:'t5'}},
  {id:'n5', farm:'santafe', icon:'📦', title:'Estoque baixo — Fertilizante NPK 08-20-18', body:'O estoque de Fertilizante NPK 08-20-18 na Fazenda Santa Fé está abaixo do mínimo cadastrado (12 de 15 toneladas).', time:'Ontem', category:'Estoque', priority:'Média', target:{screen:'activities'}},
];

const statusMeta = {
  favoravel:{label:'Favorável', icon:'✓'},
  atencao:{label:'Atenção', icon:'⚠'},
  desfavoravel:{label:'Desfavorável', icon:'⛔'},
  dados:{label:'Dados insuficientes', icon:'—'},
  concluida:{label:'Concluída', icon:'✓'},
};

// ---------------------------------------------------------------
// CUSTOS — ledger simples alimentado pelo uso de insumos, máquinas e
// alimentação; base para os relatórios de custo por fazenda/talhão.
// ---------------------------------------------------------------
const costLedger = [
  {d:'2026-08-10', farmId:'santafe', farmName:'Fazenda Santa Fé', talhaoId:'t1', talhaoName:'Talhão 3 — Soja', category:'Insumo', desc:'Herbicida Glifosato (40 litros)', value:1120},
  {d:'2026-08-08', farmId:'santafe', farmName:'Fazenda Santa Fé', talhaoId:'t2', talhaoName:'Talhão 5 — Soja', category:'Máquina', desc:'Pulverizador autopropelido (4 h)', value:1040},
  {d:'2026-08-05', farmId:'boaesperanca', farmName:'Fazenda Boa Esperança', talhaoId:null, talhaoName:null, loteId:'l1', loteName:'Lote 2 — Cria', category:'Alimentação', desc:'Sal mineral (30 kg)', value:126},
];
function logCost(entry){ costLedger.unshift({d:isoToday(), ...entry}); }

// ---------------------------------------------------------------
// REGISTROS DE CAMPO — captura geral (observação, ocorrência,
// manutenção etc.) com foto/áudio/GPS/assinatura simulados, podendo
// ser vinculada a uma fazenda, talhão, lote ou animal específico.
// ---------------------------------------------------------------
const fieldRecords = [
  {id:'fr1', d:'2026-08-13', type:'Ocorrência', farmId:'santafe', farmName:'Fazenda Santa Fé', ref:'Talhão 3 — Soja',
    desc:'Trecho de cerca danificado próximo à estrada de acesso — providenciado reparo emergencial.', author:'Marcos Lima',
    tags:['📷 foto anexada','📍 GPS registrado'], editHistory:[]},
  {id:'fr2', d:'2026-08-09', type:'Manutenção', farmId:'santafe', farmName:'Fazenda Santa Fé', ref:'Pulverizador autopropelido',
    desc:'Troca de bicos de pulverização e calibração do equipamento antes da aplicação.', author:'Marcos Lima',
    tags:['📷 foto anexada'], editHistory:[]},
];
// Com o back-end real configurado, os dados acima (Fazenda Santa Fé, Boa
// Esperança etc.) nunca devem aparecer pra ninguém — nem por um instante
// atrás da tela de login, antes da pessoa entrar. loadFarmsFromBackend() já
// limpa tudo isso depois do login, mas o app agora zera na hora, assim que
// carrega, pra essa demonstração nunca "piscar" atrás do formulário de
// entrar/criar conta (o que aparentava ser um bug de tema, mas era só isso
// mesmo: dado de exemplo desenhado embaixo do overlay).
if(BACKEND_ENABLED){
  Object.keys(farms).forEach(k => delete farms[k]);
  activities.length = 0;
  notifications.length = 0;
  costLedger.length = 0;
  fieldRecords.length = 0;
}
function openAddFieldRecordForm(prefFarmId){
  const farmOptions = Object.values(farms).map(f=>({value:f.id, label:f.name}));
  openSheet('Novo registro de campo', `
    <div class="form-row2">
      <div class="form-field"><label>Tipo</label>${styledSelectHTML('fr_type', ['Observação','Ocorrência','Manutenção','Outro'].map(v=>({value:v,label:v})), 'Observação')}</div>
      <div class="form-field"><label>Propriedade</label>${styledSelectHTML('fr_farm', farmOptions, prefFarmId)}</div>
    </div>
    <div class="form-field"><label>Referência (talhão, lote, animal, máquina — opcional)</label><input id="fr_ref" placeholder="Ex: Talhão 3 — Soja"></div>
    <div class="form-field"><label>Descrição</label>
      <textarea id="fr_desc" rows="3" placeholder="Descreva o que foi observado ou realizado..."></textarea>
      <button type="button" id="fr_desc_mic" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:6px;padding:7px;" onclick="startVoiceDictation('fr_desc', this)">🎙️ Ditar por voz</button>
    </div>
    <div class="toggle-row"><span class="tlabel">Anexar foto (simulado)</span><input type="checkbox" id="fr_foto" style="width:18px;height:18px;"></div>
    <div class="toggle-row"><span class="tlabel">Anexar áudio (simulado)</span><input type="checkbox" id="fr_audio" style="width:18px;height:18px;"></div>
    <div class="toggle-row"><span class="tlabel">Marcar localização GPS (simulado)</span><input type="checkbox" id="fr_gps" style="width:18px;height:18px;"></div>
    <div class="toggle-row"><span class="tlabel">Assinatura digital (simulado)</span><input type="checkbox" id="fr_sig" style="width:18px;height:18px;"></div>
    <button class="sheet-save" onclick="saveFieldRecord()">Salvar registro</button>
  `);
}
function saveFieldRecord(){
  const desc = document.getElementById('fr_desc').value.trim();
  if(!desc){ showToast('Descreva o registro'); return; }
  const farmId = document.getElementById('fr_farm').value;
  const f = farms[farmId];
  const tags = [
    document.getElementById('fr_foto').checked ? '📷 foto anexada' : null,
    document.getElementById('fr_audio').checked ? '🎙️ áudio anexado' : null,
    document.getElementById('fr_gps').checked ? '📍 GPS registrado' : null,
    document.getElementById('fr_sig').checked ? '✍️ assinado digitalmente' : null,
  ].filter(Boolean);
  fieldRecords.unshift({id:newId('fr'), d:isoToday(), type:document.getElementById('fr_type').value,
    farmId, farmName:f.name, ref:document.getElementById('fr_ref').value.trim()||'—', desc, author:currentViewMember().name, tags, editHistory:[]});
  closeSheet();
  openFieldRecordsSheet();
  updateFieldRecordsSummary();
  registerChange(`Registro de campo criado: ${desc.slice(0,40)}${desc.length>40?'…':''}`);
}
function updateFieldRecordsSummary(){
  const el = document.getElementById('fieldRecordsSummary');
  if(el) el.textContent = `${fieldRecords.length} registro${fieldRecords.length!==1?'s':''}`;
}
function openFieldRecordsSheet(prefFarmId){
  renderFieldRecordsBody(prefFarmId);
}
function renderFieldRecordsBody(prefFarmId){
  const rows = fieldRecords.map(r=>`
    <div class="card" style="margin-bottom:8px;">
      <div class="kv-row"><span class="k"><b>${r.type}</b> · ${r.farmName}</span><span class="v">${fmtDate(r.d)}</span></div>
      <div style="font-size:11px;color:var(--ink-muted);margin:2px 0 6px;">${r.ref}</div>
      <div style="font-size:12px;color:var(--ink-2);line-height:1.5;">${r.desc}</div>
      <div style="font-size:11px;color:var(--ink-muted);margin-top:6px;">${r.tags.join(' · ')||'Sem anexos'} · por ${r.author}${(r.editHistory&&r.editHistory.length)?` · editado ${r.editHistory.length}x`:''}</div>
      ${(r.editHistory&&r.editHistory.length) ? `<details style="margin-top:6px;"><summary style="font-size:10.5px;color:var(--brand);cursor:pointer;">Ver histórico de alterações</summary>
        ${r.editHistory.map(h=>`<div style="font-size:10.5px;color:var(--ink-muted);padding:4px 0;border-top:1px dashed var(--border);">${fmtDate(h.d)} — versão anterior: "${h.prevDesc}"</div>`).join('')}
      </details>` : ''}
      <button class="action-btn" style="margin-top:6px;" onclick="openEditFieldRecord('${r.id}')">Editar registro</button>
    </div>`).join('') || '<div class="empty-note">Nenhum registro de campo ainda.</div>';
  openSheet('Registros de campo', `
    <div class="fab-row" style="padding:0 0 10px;"><button class="fab-btn" onclick="openAddFieldRecordForm('${prefFarmId||''}')">＋ Novo registro</button></div>
    ${rows}
  `);
}
function openEditFieldRecord(id){
  const r = fieldRecords.find(x=>x.id===id);
  openSheet('Editar registro de campo', `
    <div class="form-field"><label>Referência</label><input id="fre_ref" value="${r.ref}"></div>
    <div class="form-field"><label>Descrição</label>
      <textarea id="fre_desc" rows="3">${r.desc}</textarea>
      <button type="button" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:6px;padding:7px;" onclick="startVoiceDictation('fre_desc', this)">🎙️ Ditar por voz</button>
    </div>
    <button class="sheet-save" onclick="saveEditFieldRecord('${id}')">Salvar alteração</button>
  `);
}
function saveEditFieldRecord(id){
  const r = fieldRecords.find(x=>x.id===id);
  const newDesc = document.getElementById('fre_desc').value.trim();
  const newRef = document.getElementById('fre_ref').value.trim();
  if(!newDesc){ showToast('A descrição não pode ficar vazia'); return; }
  if(newDesc!==r.desc || newRef!==r.ref){
    r.editHistory = r.editHistory || [];
    r.editHistory.unshift({d:isoToday(), prevDesc:r.desc, prevRef:r.ref, editedBy:currentViewMember().name});
    r.desc = newDesc; r.ref = newRef || r.ref;
  }
  closeSheet();
  openFieldRecordsSheet();
  registerChange(`Registro de campo editado (${r.type})`);
}

// ---------------------------------------------------------------
// DATA/TEMPO — "hoje" do app é fixado em 15/08/2026 (data do
// Documento Mestre), pra manter os cálculos consistentes.
// ---------------------------------------------------------------
const APP_TODAY = new Date(2026, 7, 15);
const MESES_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESES_PT_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
function isoToday(){ return APP_TODAY.toISOString().slice(0,10); }
function parseISO(iso){ if(!iso) return null; const [y,m,d]=iso.split('-').map(Number); return new Date(y, m-1, d); }
function fmtDate(iso){
  const dt = parseISO(iso);
  if(!dt) return '—';
  return `${String(dt.getDate()).padStart(2,'0')} ${MESES_PT[dt.getMonth()]}`;
}
function daysBetween(isoA, isoB){
  const a = parseISO(isoA), b = parseISO(isoB);
  if(!a||!b) return null;
  return Math.round((b-a)/86400000);
}
function daysFromToday(iso){ return iso ? daysBetween(isoToday(), iso) : null; } // positivo = futuro, negativo = atrasado
// Deixa nome de cidade com a inicial de cada palavra maiúscula (ex:
// "araputanga" -> "Araputanga", "rio de janeiro" -> "Rio de Janeiro") — sem
// isso, o nome ficava exatamente do jeito que a pessoa digitou no celular
// (minúsculo, comum ao digitar rápido ou ditar por voz), quebrando o visual
// dos cartões de propriedade.
const PT_LOWERCASE_WORDS = ['de','da','do','das','dos','e'];
function titleCasePt(str){
  if(!str) return str;
  return str.trim().toLowerCase().split(/\s+/).map((w,i)=>{
    if(i>0 && PT_LOWERCASE_WORDS.includes(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

// ---------------------------------------------------------------
// HELPERS DE REBANHO (usados no Painel da Pecuária, Sanidade etc.)
// ---------------------------------------------------------------
function allFarmsWithPec(){ return Object.values(farms).filter(f=>f.animals && f.animals.length>=0 && (f.type==='pec'||f.type==='mista')); }
function allFarmsWithAgro(){ return Object.values(farms).filter(f=>f.talhoes && (f.type==='agro'||f.type==='mista')); }
function allAnimalsFlat(){
  const out = [];
  Object.values(farms).forEach(f=>(f.animals||[]).forEach(a=>out.push({...a, _farmId:f.id, _farmName:f.name})));
  return out;
}
function animalWeighings(a){
  return (a.history||[]).filter(h=>h.t==='Pesagem' && h.meta && typeof h.meta.weight==='number').slice().sort((x,y)=>parseISO(x.d)-parseISO(y.d));
}
function animalDailyGain(a){
  const w = animalWeighings(a);
  if(w.length<2) return null;
  const last = w[w.length-1], prev = w[w.length-2];
  const days = daysBetween(prev.d, last.d);
  if(!days || days<=0) return null;
  return (last.meta.weight - prev.meta.weight) / days;
}
function animalMilkEntries(a){
  return (a.history||[]).filter(h=>h.t==='Produção' && h.meta && typeof h.meta.liters==='number').slice().sort((x,y)=>parseISO(x.d)-parseISO(y.d));
}
function animalHealthTasks(a){
  // tarefas de sanidade pendentes/atrasadas: vacina, vermífugo e medicamento com próxima data
  const tasks = [];
  if(a.nextVaccine){ tasks.push({type:'Vacina', due:a.nextVaccine, days:daysFromToday(a.nextVaccine)}); }
  (a.history||[]).forEach(h=>{
    if((h.t==='Vermífugo'||h.t==='Medicamento') && h.meta && h.meta.nextDate){
      tasks.push({type:h.t, due:h.meta.nextDate, days:daysFromToday(h.meta.nextDate)});
    }
  });
  return tasks;
}
function animalWithdrawalActive(a){
  const withActive = (a.history||[]).find(h=>h.meta && h.meta.withdrawalUntil && daysFromToday(h.meta.withdrawalUntil)>=0);
  return withActive ? withActive.meta.withdrawalUntil : null;
}
function milkTrend7Days(farmIdFilter){
  const animals = farmIdFilter ? (farms[farmIdFilter].animals||[]) : allAnimalsFlat();
  const days = [];
  for(let i=6;i>=0;i--){ days.push(addDaysISO(isoToday(), -i)); }
  return days.map(d=>{
    const total = animals.reduce((s,a)=>{
      const entry = (a.history||[]).find(h=>h.t==='Produção' && h.d===d && h.meta && typeof h.meta.liters==='number');
      return s + (entry ? entry.meta.liters : 0);
    }, 0);
    return {d, total};
  });
}
// Tile de estatística com ícone colorido em cima do número — usado nos
// resumos embutidos nas abas Pecuária/Agricultura (ver pecResumoCardHTML/
// agroResumoCardHTML) e reaproveita o mesmo .stat-tile dos painéis.
function statTile(icon, bgClass, num, label){
  return `<div class="stat-tile with-icon"><div class="st-ic ${bgClass}">${svgIcon(icon,{size:14})}</div><div class="stat-num">${num}</div><div class="stat-lbl">${label}</div></div>`;
}
function categoryCounts(farmIdFilter){
  const counts = {};
  const pool = farmIdFilter ? (farms[farmIdFilter].animals||[]) : allAnimalsFlat();
  pool.forEach(a=>{ if(a.statusPlantel!=='Morto' && a.statusPlantel!=='Vendido' && a.statusPlantel!=='Descartado'){ counts[a.category||'Outros'] = (counts[a.category||'Outros']||0)+1; } });
  return counts;
}

// ---------------------------------------------------------------
// ESPÉCIES — a Pecuária não é só gado: dá pra cadastrar cavalo, jumento/
// burro, mula etc. Cada espécie tem seu próprio conjunto de categorias
// (uma vaca não é "Potro", um cavalo não é "Bezerro") e seu emoji de foto
// padrão. Animais já cadastrados sem o campo "species" (de antes dessa
// função existir) são tratados como 'bovino' — o comportamento de sempre.
// ---------------------------------------------------------------
const ANIMAL_SPECIES = [
  {id:'bovino', label:'Bovino (gado)'},
  {id:'equino', label:'Equino (cavalo)'},
  {id:'asinino', label:'Asinino (jumento/burro)'},
  {id:'muar', label:'Muar (mula)'},
  {id:'caprino', label:'Caprino (cabra)'},
  {id:'ovino', label:'Ovino (ovelha)'},
  {id:'suino', label:'Suíno (porco)'},
  {id:'outro', label:'Outra espécie'},
];
const SPECIES_LABELS = ANIMAL_SPECIES.reduce((m,s)=>{ m[s.id]=s.label; return m; }, {});
const SPECIES_CATEGORIES = {
  bovino: ['Bezerro','Bezerra','Novilha','Novilho','Vaca','Touro','Boi'],
  equino: ['Potro','Potranca','Égua','Garanhão','Castrado'],
  asinino: ['Jumento','Jumenta','Burro','Burra'],
  muar: ['Mula','Bardoto'],
  caprino: ['Cabrito','Cabrita','Cabra','Bode'],
  ovino: ['Cordeiro','Cordeira','Ovelha','Carneiro'],
  suino: ['Leitão','Leitoa','Porca','Cachaço'],
  outro: ['Fêmea jovem','Macho jovem','Fêmea adulta','Macho adulto'],
};
// Foto padrão (emoji) por espécie — o gado mantém o critério antigo
// (vaca/touro conforme o sexo) pra não mudar a cara de quem já tinha
// animais cadastrados; as demais espécies usam um emoji fixo.
// Obs: usamos só emojis "clássicos" (Unicode antigo) aqui, mesmo pra
// jumento/burro e mula (que tecnicamente têm cara diferente do cavalo) —
// o emoji de jumento é recente demais e pode aparecer como quadradinho
// (não suportado) em aparelhos Android mais antigos, o que pareceria um
// bug visual novo.
const SPECIES_EMOJI = {equino:'🐴', asinino:'🐴', muar:'🐴', caprino:'🐐', ovino:'🐑', suino:'🐖', outro:'🐾'};
function animalPhotoEmoji(species, sex){
  if(!species || species==='bovino') return sex==='Macho' ? '🐂' : '🐄';
  return SPECIES_EMOJI[species] || '🐾';
}
function speciesCategoryOptions(speciesId){
  const cats = SPECIES_CATEGORIES[speciesId] || SPECIES_CATEGORIES.bovino;
  return cats.map(c=>({value:c, label:c}));
}
// Nome da cria ao nascer (evento "Parto"), por espécie — pra não chamar
// de "bezerro" a cria de uma égua ou de uma cabra.
const SPECIES_OFFSPRING = {
  bovino: {Macho:'Bezerro', Fêmea:'Bezerra', generic:'Bezerro(a)'},
  equino: {Macho:'Potro', Fêmea:'Potranca', generic:'Potro(a)'},
  asinino: {Macho:'Jumento', Fêmea:'Jumenta', generic:'Jumentinho(a)'},
  caprino: {Macho:'Cabrito', Fêmea:'Cabrita', generic:'Cabrito(a)'},
  ovino: {Macho:'Cordeiro', Fêmea:'Cordeira', generic:'Cordeiro(a)'},
  suino: {Macho:'Leitão', Fêmea:'Leitoa', generic:'Leitão(oa)'},
};
function speciesOffspringInfo(species){ return SPECIES_OFFSPRING[species] || SPECIES_OFFSPRING.bovino; }
// Contagem de animais por espécie (painel da Pecuária) — só aparece quando
// há mais de uma espécie cadastrada, pra não poluir quem só tem gado.
function speciesCounts(farmIdFilter){
  const counts = {};
  const pool = farmIdFilter ? (farms[farmIdFilter].animals||[]) : allAnimalsFlat();
  pool.forEach(a=>{ if(a.statusPlantel!=='Morto' && a.statusPlantel!=='Vendido' && a.statusPlantel!=='Descartado'){
    const sp = a.species||'bovino'; counts[sp] = (counts[sp]||0)+1;
  }});
  return counts;
}
// Substitui o <select> da Categoria em Novo animal (individual/lote) pelas
// opções certas da espécie escolhida, sem perder o resto do que já foi
// preenchido no formulário (troca só esse campo, não a ficha inteira).
function onAnimalSpeciesChangeIndividual(speciesId){ refreshAnimalCategoryOptions('na', speciesId); }
function onAnimalSpeciesChangeBulk(speciesId){ refreshAnimalCategoryOptions('nb', speciesId); }
function refreshAnimalCategoryOptions(prefix, speciesId){
  const catOptions = speciesCategoryOptions(speciesId);
  const wrap = document.getElementById(prefix+'_category_cs');
  if(!wrap) return;
  wrap.outerHTML = styledSelectHTML(prefix+'_category', catOptions, catOptions[0].value);
}

// ---------------------------------------------------------------
// LISTA DE ANIMAIS (aba Pecuária) — filtro por categoria, ordenação e contagem
// ---------------------------------------------------------------
let animalListFilter = 'todos';
let animalListSort = 'brinco';
const ANIMAL_FILTER_CHIPS = [
  {id:'todos', label:'Todos'}, {id:'Vaca', label:'Vacas'}, {id:'Bezerro', label:'Bezerros'},
  {id:'Bezerra', label:'Bezerras'}, {id:'Touro', label:'Touros'}, {id:'Novilha', label:'Novilhas'}, {id:'Novilho', label:'Novilhos'}, {id:'Boi', label:'Bois'},
];
function setAnimalListFilter(id){ animalListFilter = id; renderPropertyTab(); }
function setAnimalListSort(sort){ animalListSort = sort; renderPropertyTab(); }
// Badge de status colorido do animal (Em lactação/Prenha/Recém-nascido/
// Pós-parto/Crescimento/Ativo/Vendido-Morto-Descartado) — deriva do que já
// existe em milkStatus/situation/statusPlantel, sem precisar de campo novo.
function animalStatusBadge(a){
  if(a.statusPlantel && a.statusPlantel!=='Ativo') return {label:a.statusPlantel, cls:'st-inactive'};
  if(a.milkStatus==='Lactante') return {label:'Em lactação', cls:'st-lac'};
  const sit = a.situation||'';
  if(/gestante|prenh/i.test(sit)) return {label:'Prenha', cls:'st-preg'};
  if(/pós-parto/i.test(sit)) return {label:'Pós-parto', cls:'st-post'};
  if(/recém-nascido/i.test(sit)) return {label:'Recém-nascido', cls:'st-new'};
  if(/recria|engorda|crescimento/i.test(sit)) return {label:sit, cls:'st-grow'};
  return {label:'Ativo', cls:'st-active'};
}
function renderAnimalListSection(f){
  const activeCatsList = Array.from(new Set(f.animals.map(a=>a.category).filter(Boolean)));
  const activeCats = new Set(activeCatsList);
  // Categorias de gado conhecidas usam o rótulo pluralizado de sempre
  // (Vacas/Touros/...); categorias de outras espécies (Potro, Jumento etc,
  // criadas na hora que a pessoa cadastra) ganham um chip próprio usando o
  // nome dela mesma, pra não ficar escondida do filtro.
  const knownChips = ANIMAL_FILTER_CHIPS.filter(c=>c.id==='todos' || activeCats.has(c.id));
  const extraChips = activeCatsList.filter(cat=>!ANIMAL_FILTER_CHIPS.some(c=>c.id===cat)).map(cat=>({id:cat, label:cat}));
  const chips = knownChips.concat(extraChips);
  const chipsHTML = `<div class="filter-row" style="padding:0 16px 8px;">${chips.map(c=>
    `<button class="chip-btn ${animalListFilter===c.id?'active':''}" onclick="setAnimalListFilter('${c.id}')">${c.label}</button>`).join('')}</div>`;

  let list = animalListFilter==='todos' ? f.animals.slice() : f.animals.filter(a=>a.category===animalListFilter);
  if(animalListSort==='producao') list.sort((a,b)=>(b.production||0)-(a.production||0));
  else if(animalListSort==='peso') list.sort((a,b)=>(b.weight||0)-(a.weight||0));
  else list.sort((a,b)=>a.brinco.localeCompare(b.brinco));

  const animalSortOptions = [
    {value:'brinco', label:'Ordenar: Brinco'},
    {value:'producao', label:'Ordenar: Produção'},
    {value:'peso', label:'Ordenar: Peso'},
  ];
  const countRow = `<div class="kv-row" style="padding:0 16px 6px;align-items:center;">
    <span class="k" style="font-weight:700;">${list.length} ${list.length===1?'animal':'animais'}</span>
    ${customSelectHTML('animalListSort_cs', animalSortOptions, animalListSort, 'setAnimalListSort', {compact:true})}
  </div>`;

  const rows = list.map(a=>{
    const overdueTasks = animalHealthTasks(a).filter(t=>t.days!=null && t.days<0);
    const pasture = (f.pastures||[]).find(p=>p.id===a.pastureId);
    const badge = animalStatusBadge(a);
    return `<div class="animal-card" onclick="openAnimal('${f.id}','${a.id}')">
    <div class="animal-photo">${emojiIcon(a.photo,{size:22})}</div>
    <div class="animal-info">
      <div class="animal-name">${a.brinco} ${a.name!=='—'?'· '+a.name:''}</div>
      <div class="animal-sub">${a.species&&a.species!=='bovino'?(SPECIES_LABELS[a.species]||a.species)+' · ':''}${a.breed} · ${a.category||'—'} · ${a.sex}${pasture?' · '+pasture.name:''}</div>
      <div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap;">
        <span class="tag ${badge.cls}">${badge.label}</span>
        ${overdueTasks.length ? `<span class="tag alert">${overdueTasks.length} atrasado(s)</span>` : ''}
      </div>
    </div>
    <span class="chev">›</span>
  </div>`;}).join('') || '<div class="empty-note">Nenhum animal nesta categoria.</div>';

  return chipsHTML + countRow + rows;
}

// ---------------------------------------------------------------
// DRAG-TO-SCROLL for horizontal chip/tab rows (mouse users without
// a trackpad were dragging the text instead of scrolling the row)
// ---------------------------------------------------------------
(function(){
  let dragEl = null, startX = 0, startScroll = 0, moved = false;
  document.addEventListener('mousedown', (e)=>{
    const row = e.target.closest('.filter-row, .tabs-row');
    if(!row) return;
    dragEl = row; startX = e.clientX; startScroll = row.scrollLeft; moved = false;
    // Não adiciona a classe "dragging" aqui: fazer isso já no mousedown ativa
    // "pointer-events:none" nos chips (ver CSS) antes mesmo de saber se a
    // pessoa está arrastando ou só clicando — e isso fazia o evento de clique
    // "vazar" para o elemento pai, cancelando o clique no botão do filtro.
    // Só marcamos como arrasto de verdade (e aplicamos a classe) depois que
    // houver movimento de fato, no mousemove abaixo.
  });
  document.addEventListener('mousemove', (e)=>{
    if(!dragEl) return;
    const dx = e.clientX - startX;
    if(Math.abs(dx) > 3 && !moved){ moved = true; dragEl.classList.add('dragging'); }
    if(moved){ dragEl.scrollLeft = startScroll - dx; e.preventDefault(); }
  });
  window.addEventListener('mouseup', ()=>{
    if(dragEl){ dragEl.classList.remove('dragging'); }
    dragEl = null;
  });
  // Prevent a completed drag from also firing a click on the chip underneath
  document.addEventListener('click', (e)=>{
    if(moved && e.target.closest('.filter-row, .tabs-row')){ e.stopPropagation(); e.preventDefault(); moved = false; }
  }, true);
})();

// ---------------------------------------------------------------
// NAVIGATION
// ---------------------------------------------------------------
let currentScreen = 'screen-home';
let backStack = [];

function showScreen(id, dir){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active','dir-fwd','dir-back','dir-fade'));
  const el = document.getElementById(id);
  el.classList.add('active', 'dir-'+(dir||'fade'));
  document.getElementById('appBody').scrollTop = 0;
  animateStatTiles(el);
  renderDesktopTopbar(id);
}
// ---------------------------------------------------------------
// BARRA SUPERIOR DO MODO DESKTOP — mostra em qual tela a pessoa está
// (igual uma trilha "Início / Visão geral" de sistema de verdade). Passa
// despercebida no celular (a barra fica escondida pelo CSS), então essa
// função pode rodar sempre, sem checar largura de tela aqui.
const DESKTOP_SCREEN_LABELS = {
  'screen-home': ['Início', 'Visão geral'],
  'screen-properties': ['Propriedades', 'Todas as propriedades'],
  'screen-property': ['Propriedades', 'Detalhes da propriedade'],
  'screen-condition': ['Propriedades', 'Condição do talhão'],
  'screen-animal': ['Pecuária', 'Ficha do animal'],
  'screen-activity-detail': ['Atividades', 'Detalhes da atividade'],
  'screen-activities': ['Atividades', 'Todas as atividades'],
  'screen-notifications': ['Início', 'Notificações'],
  'screen-reports': ['Relatórios', 'Visão geral'],
  'screen-more': ['Perfil', 'Configurações'],
};
function renderDesktopTopbar(id){
  const root = document.getElementById('dtCrumbRoot');
  const cur = document.getElementById('dtCrumbCurrent');
  if(root && cur){
    const pair = DESKTOP_SCREEN_LABELS[id] || ['AGROOP', ''];
    root.textContent = pair[0];
    cur.textContent = pair[1];
  }
  const avatar = document.getElementById('dtAvatarInitial');
  if(avatar){
    const name = (document.getElementById('greetName') || {}).textContent || '';
    avatar.textContent = name.trim().charAt(0).toUpperCase() || 'A';
  }
}
function pushScreen(id){
  backStack.push(currentScreen);
  currentScreen = id;
  showScreen(id, 'fwd');
}
function goBack(){
  if(backStack.length===0){ return; }
  currentScreen = backStack.pop();
  showScreen(currentScreen, 'back');
}
function goTab(id){
  backStack = [];
  currentScreen = id;
  showScreen(id, 'fade');
  document.querySelectorAll('.bn-item').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  document.querySelectorAll('.nav-btn[data-goto]').forEach(b=>b.classList.toggle('active', b.dataset.goto===id));
  if(id==='screen-reports') renderReports();
}
// Anima números de .stat-num (contagem crescente de 0 até o valor final) sempre
// que uma tela ou sheet com KPIs entra em cena — puramente visual, não afeta o valor final.
function animateStatTiles(root){
  if(!root || !root.querySelectorAll) return;
  root.querySelectorAll('.stat-num').forEach(el=>{
    const raw = (el.textContent||'').trim();
    const m = raw.match(/^(\d+(?:\.\d+)?)(.*)$/);
    if(!m) return;
    const target = parseFloat(m[1]);
    const suffix = m[2] || '';
    const decimals = m[1].includes('.') ? m[1].split('.')[1].length : 0;
    const duration = 550;
    const t0 = performance.now();
    function step(now){
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = target * eased;
      el.textContent = (decimals ? val.toFixed(decimals) : Math.round(val)) + suffix;
      if(t < 1) requestAnimationFrame(step);
      else el.textContent = m[1] + suffix;
    }
    requestAnimationFrame(step);
  });
}

document.querySelectorAll('.bn-item').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    // "Perfil" abre o perfil como uma folha por cima da tela atual — não navega
    // para a tela "Mais", nem troca a tela ativa por baixo.
    if(btn.dataset.tab === 'screen-more'){ openProfileSheet(); return; }
    goTab(btn.dataset.tab);
  });
});
document.querySelectorAll('.nav-btn[data-goto]').forEach(btn=>{
  btn.addEventListener('click', ()=>goTab(btn.dataset.goto));
});
document.querySelectorAll('.nav-btn[data-open-property]').forEach(btn=>{
  btn.addEventListener('click', ()=>{ backStack=['screen-home']; openProperty(btn.dataset.openProperty); });
});
document.querySelectorAll('.nav-btn[data-open-condition]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const [f,t] = btn.dataset.openCondition.split('|');
    backStack=['screen-home']; openCondition(f,t);
  });
});
document.querySelectorAll('.nav-btn[data-open-animal]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const [f,a] = btn.dataset.openAnimal.split('|');
    backStack=['screen-home']; openAnimal(f,a);
  });
});

// ---------------------------------------------------------------
// SYNC STATUS + FILA OFFLINE DE VERDADE
// ---------------------------------------------------------------
// Antes, "Offline" aqui era só uma simulação visual (um botão "Simular modo
// offline" que não refletia a conexão de verdade do aparelho e não salvava
// nada real). Agora isOffline reflete a conexão de verdade (navigator.onLine
// + os eventos 'online'/'offline' do navegador), e TODO cadastro ou edição —
// propriedade, convite de equipe, talhão, lote, animal, pasto, alimentação,
// insumo, máquina, atividade, custo, registro de campo — fica guardado no
// aparelho (localStorage) na hora, mesmo sem internet e mesmo que a pessoa
// feche o app em seguida, e é enviado pro Supabase sozinho assim que a
// internet volta (ver reconcileLocalChanges(), mais abaixo, pra talhões,
// animais etc. — propriedade e convite têm sua própria fila específica,
// escrita à mão nas funções logo abaixo desta).
const SYNC_QUEUE_KEY = 'agroop_sync_queue_v1';
function loadSyncQueueFromStorage(){
  try{ return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]'); }catch(e){ return []; }
}
function saveSyncQueueToStorage(){
  try{ localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue)); }catch(e){}
}
let syncQueue = loadSyncQueueFromStorage();
let isOffline = !navigator.onLine;
let isSyncingQueue = false;
function pendingQueueCount(){ return syncQueue.length; }
// Compatibilidade com o restante do app, que já lia "pendingQueue" como número.
Object.defineProperty(window, 'pendingQueue', { get: pendingQueueCount });

function setSyncUI(cls, label){
  const pill = document.getElementById('syncPill');
  if(pill) pill.className = 'sync-pill ' + cls;
  const l1 = document.getElementById('syncLabel'); if(l1) l1.textContent = label;
  const l2 = document.getElementById('moreSyncStatus'); if(l2) l2.textContent = label;
  // mesmo indicador, só que na barra superior do modo desktop.
  const dtPill = document.getElementById('dtSyncPill');
  if(dtPill) dtPill.className = 'dt-sync-pill ' + cls;
  const l3 = document.getElementById('dtSyncLabel'); if(l3) l3.textContent = label;
}
function refreshSyncUI(){
  if(isSyncingQueue){ setSyncUI('syncing', 'Sincronizando…'); return; }
  if(isOffline || pendingQueueCount()>0){
    const n = pendingQueueCount();
    setSyncUI('offline', n>0 ? `Offline · ${n} registro${n!==1?'s':''} na fila` : 'Offline');
  } else {
    setSyncUI('', 'Sincronizado agora');
  }
}
// Botão "Sincronizar agora" / "Simular modo offline" da tela de Sincronização.
function cycleSync(){
  if(pendingQueueCount()>0){ trySyncQueue(true); return; }
  if(navigator.onLine) showToast('Já está tudo sincronizado.');
  else showToast('Sem conexão no momento — assim que a internet voltar, sincroniza sozinho.');
  refreshSyncUI();
}
// Ajuda a distinguir "sem conexão" (guarda offline e tenta de novo depois)
// de um erro de verdade do servidor (ex: dado inválido, permissão negada) —
// esse segundo caso não deve ficar preso numa fila tentando pra sempre.
function looksLikeNetworkError(err){
  if(!navigator.onLine) return true;
  if(!err) return false;
  const msg = ((err.message || '') + '').toLowerCase();
  return err.name === 'TypeError' || msg.includes('fetch') || msg.includes('network') || msg.includes('load failed') || msg.includes('conex');
}
// Guarda uma gravação pendente pra tentar de novo quando a internet voltar.
function enqueueSyncOp(entity, kind, payload){
  if(kind === 'upsert'){
    // Editou o mesmo animal/talhão/etc. várias vezes offline antes de
    // sincronizar? Manda só a versão mais recente — sem isso a fila
    // reenviaria cada alteração intermediária, uma por uma, à toa.
    syncQueue = syncQueue.filter(op => !(op.entity===entity && op.kind==='upsert' && op.payload && op.payload.id===payload.id));
  }
  syncQueue.push({ id:'op'+Date.now()+Math.random().toString(36).slice(2,7), entity, kind, payload, createdAt:Date.now() });
  saveSyncQueueToStorage();
  refreshSyncUI();
}
// Tenta enviar tudo que está na fila pro Supabase, na ordem em que foi criado.
// Chamado automaticamente quando a conexão volta, e manualmente pelo botão
// "Sincronizar agora".
async function trySyncQueue(manual){
  if(isSyncingQueue || !BACKEND_ENABLED || !currentAuthUser) return;
  if(!navigator.onLine){ if(manual) showToast('Ainda sem conexão — tente de novo em instantes.'); return; }
  if(syncQueue.length===0){ if(manual) showToast('Nada pendente pra sincronizar.'); return; }
  isSyncingQueue = true;
  refreshSyncUI();
  const remaining = [];
  let okCount = 0;
  for(const op of syncQueue){
    try{ await applySyncOp(op); okCount++; }
    catch(e){ remaining.push(op); }
  }
  syncQueue = remaining;
  saveSyncQueueToStorage();
  isSyncingQueue = false;
  isOffline = !navigator.onLine;
  refreshSyncUI();
  // O aviso de sincronização (sucesso ou pendência) só aparece como toast
  // quando a pessoa pediu manualmente ("Sincronizar agora") — sincronização
  // automática (a cada 30s, ou assim que a internet volta) acontece sempre
  // em silêncio. O status já fica visível o tempo todo no indicador
  // "Sincronizado agora / Offline · N na fila" (ver refreshSyncUI acima),
  // sem precisar interromper a pessoa com uma caixa preta toda hora.
  if(manual && okCount>0) showToast(`${okCount} registro${okCount!==1?'s':''} sincronizado${okCount!==1?'s':''} com o servidor.`);
  if(manual && remaining.length>0) showToast('Alguns registros ainda não puderam ser enviados. Vamos tentar de novo em breve.');
}
// Aplica de fato uma operação enfileirada no Supabase.
async function applySyncOp(op){
  if(op.entity === 'farm' && op.kind === 'insert'){
    const { data, error } = await sb.from('farms').insert(op.payload.insertData).select().single();
    if(error) throw error;
    remapLocalFarmId(op.payload.tempId, data);
    return;
  }
  if(op.entity === 'invite' && op.kind === 'insert'){
    const created = await createRealInvite(op.payload, { silent:true });
    if(!created) throw new Error('invite_insert_failed');
    remapLocalInviteId(op.payload.tempId, created);
    return;
  }
  if(op.entity === 'farm' && op.kind === 'update'){
    const { error } = await sb.from('farms').update(op.payload.changes).eq('id', op.payload.id);
    if(error) throw error;
    return;
  }
  if(op.entity === 'farm' && op.kind === 'delete'){
    const { error } = await sb.from('farms').delete().eq('id', op.payload.id);
    if(error) throw error;
    return;
  }
  const spec = findEntitySpec(op.entity);
  if(spec){
    if(op.kind === 'upsert'){
      const row = { id: op.payload.id, data: op.payload.data, updated_at: new Date().toISOString() };
      if(op.payload.farmId) row.farm_id = op.payload.farmId;
      const { error } = await sb.from(spec.table).upsert(row, { onConflict:'id' });
      if(error) throw error;
      return;
    }
    if(op.kind === 'delete'){
      const { error } = await sb.from(spec.table).delete().eq('id', op.payload.id);
      if(error) throw error;
      return;
    }
  }
  // Operação de um tipo que essa versão do app não sabe mais sincronizar —
  // descarta em vez de ficar tentando pra sempre.
}
// Troca o id temporário (gerado no aparelho, offline) da propriedade pelo id
// de verdade que o Supabase gerou, em todo lugar que guarda esse id.
function remapLocalFarmId(tempId, row){
  if(!farms[tempId]) return;
  const farm = farms[tempId];
  delete farms[tempId];
  farm.id = row.id;
  farm.pendingSync = false;
  farms[row.id] = farm;
  if(homeWeatherFarmId === tempId) homeWeatherFarmId = row.id;
  // Um talhão/animal/etc. cadastrado offline nessa MESMA propriedade, antes
  // dela sincronizar, guardou na fila o id temporário da propriedade (o
  // único que existia até agora). Sem essa troca, quando a vez dele chegar
  // a gravação seria rejeitada (o id temporário não existe mais no banco).
  syncQueue.forEach(op => {
    if(op.payload && op.payload.farmId === tempId) op.payload.farmId = row.id;
  });
  saveSyncQueueToStorage();
  refreshAllScreens();
}
function remapLocalInviteId(tempId, member){
  const m = teamMembers.find(x=>x.id===tempId);
  if(!m) return;
  m.id = member.id; m.inviteId = member.inviteId; m.code = member.code; m.pendingSync = false;
  updateTeamSummary();
}
// Reconstrói na tela o que ainda está preso na fila offline (ex: a pessoa
// cadastrou algo sem internet, fechou o app antes de sincronizar, e abriu
// de novo) — sem isso o cadastro continuaria seguro no aparelho, mas
// sumiria da tela até a sincronização rodar.
function mergePendingQueueIntoLocalState(){
  if(!currentAuthUser) return;
  const displayName = (currentAuthUser.user_metadata && currentAuthUser.user_metadata.full_name) || currentAuthUser.email || 'Você';
  const iconByType = {agro:'🌱', pec:'🐄', mista:'🌤️'};
  const colorByType = {agro:'var(--agro)', pec:'var(--pec)', mista:'var(--sky)'};
  syncQueue.forEach(op => {
    if(op.entity === 'farm' && op.kind === 'insert' && !farms[op.payload.tempId]){
      const d = op.payload.insertData;
      farms[op.payload.tempId] = {
        id: op.payload.tempId, name: d.name, city: d.city, state: d.state, type: d.type,
        color: colorByType[d.type], icon: iconByType[d.type], photoUrl: d.photo_url,
        area: d.area_ha+' ha', coords: d.coords,
        team:[`${displayName} — Proprietário`],
        weather:{temp:26, cond:'Sem dados ainda', icon:'❔', updated:'—', rain:0},
        talhoes:[], lotes:[], animals:[], pastures:[], feed:[], inputs:[], machines:[],
        pendingSync:true,
      };
    }
    if(op.entity === 'invite' && op.kind === 'insert' && !teamMembers.find(m=>m.id===op.payload.tempId)){
      const d = op.payload;
      teamMembers.push({ id:d.tempId, code: generateInviteCode(), name:d.name, role:d.role, access:d.access, channel:d.channel, contact:d.contact, status:'pendente', pendingSync:true });
    }
    const spec = findEntitySpec(op.entity);
    if(spec && (op.kind === 'upsert' || op.kind === 'delete')){
      if(op.kind === 'upsert'){
        const targetArr = spec.farmScoped ? (farms[op.payload.farmId] && spec.getArray(farms[op.payload.farmId])) : spec.getArray();
        if(targetArr && !targetArr.find(r=>r && r.id===op.payload.id)) targetArr.push(op.payload.data);
      } else {
        // Delete ainda não é usado por nenhuma tela hoje, mas fica pronto:
        // procura o registro em qualquer propriedade (ou na lista solta,
        // pra atividades/custos/registros de campo) e remove.
        if(spec.farmScoped){
          Object.values(farms).forEach(f=>{
            const arr = spec.getArray(f);
            const idx = arr.findIndex(r=>r && r.id===op.payload.id);
            if(idx>=0) arr.splice(idx,1);
          });
        } else {
          const arr = spec.getArray();
          const idx = arr.findIndex(r=>r && r.id===op.payload.id);
          if(idx>=0) arr.splice(idx,1);
        }
      }
    }
  });
}

// ---------------------------------------------------------------
// SINCRONIZAÇÃO REAL DE TODO O RESTO — talhões, lotes, animais, pastos,
// alimentação, insumos, máquinas, atividades, custos e registros de campo
// (a "Fase 3" citada nos comentários acima). Em vez de sair mexendo em cada
// uma das dezenas de telas que criam/editam esses dados, a gente usa o
// mesmo ponto por onde TODAS elas já passam — registerChange() — pra
// descobrir sozinho o que mudou desde a última vez e mandar pra mesma fila
// offline que já existe (mesmo mecanismo comprovado das propriedades).
// Assim nenhuma tela precisa "saber" que sincronização existe.
//
// Cada entidade vira uma linha só (id, farm_id, um "data" com o registro
// inteiro, e datas de criação/atualização) — schema simples e igual pra
// todas, fácil de conferir e de estender depois com colunas próprias se um
// dia for preciso (relatórios mais pesados, por exemplo).
const SYNC_ENTITIES = [
  { kind:'talhao',   table:'talhoes',       farmScoped:true,  getArray:(f)=>f.talhoes,   ascending:true  },
  { kind:'lote',     table:'lotes',         farmScoped:true,  getArray:(f)=>f.lotes,     ascending:true  },
  { kind:'animal',   table:'animals',       farmScoped:true,  getArray:(f)=>f.animals,   ascending:true  },
  { kind:'pasture',  table:'pastures',      farmScoped:true,  getArray:(f)=>f.pastures,  ascending:true  },
  { kind:'feed',     table:'feed_items',    farmScoped:true,  getArray:(f)=>f.feed,      ascending:true  },
  { kind:'input',    table:'inputs',        farmScoped:true,  getArray:(f)=>f.inputs,    ascending:true  },
  { kind:'machine',  table:'machines',      farmScoped:true,  getArray:(f)=>f.machines,  ascending:true  },
  { kind:'activity', table:'activities',    farmScoped:false, getArray:()=>activities,    farmField:'farm',   ascending:false },
  { kind:'cost',     table:'costs',         farmScoped:false, getArray:()=>costLedger,    farmField:'farmId', ascending:false },
  { kind:'fieldrec', table:'field_records', farmScoped:false, getArray:()=>fieldRecords,  farmField:'farmId', ascending:false },
];
function findEntitySpec(kind){ return SYNC_ENTITIES.find(s=>s.kind===kind); }

// Fotografia (id -> JSON do registro) de como cada entidade estava da
// última vez que conferimos. Serve só pra saber o que é novo, o que mudou
// e o que sumiu — nunca é mostrada na tela.
let entitySnapshots = {};
function snapshotEntityArray(spec){
  const map = {};
  const visit = rec => { if(rec && rec.id) map[rec.id] = JSON.stringify(rec); };
  if(spec.farmScoped){ Object.values(farms).forEach(f => (spec.getArray(f)||[]).forEach(visit)); }
  else { (spec.getArray()||[]).forEach(visit); }
  return map;
}
// Chamada depois de carregar os dados reais (backend + fila pendente) —
// "ancora" o ponto de partida, pra sincronização não achar que tudo que
// acabou de carregar é novidade e tentar reenviar pro servidor de novo.
function primeEntitySnapshots(){
  SYNC_ENTITIES.forEach(spec => { entitySnapshots[spec.kind] = snapshotEntityArray(spec); });
}
// O coração da Fase 3: compara o estado atual de cada entidade com o
// retrato anterior. Registro com id novo => cadastro; conteúdo diferente do
// mesmo id => edição; id que sumiu => exclusão. Cada diferença vira uma
// operação na fila offline (mesma fila de propriedades/convites), que já
// sabe guardar no aparelho e reenviar sozinha quando a internet volta.
function reconcileLocalChanges(){
  if(!BACKEND_ENABLED || !currentAuthUser) return;
  SYNC_ENTITIES.forEach(spec => {
    const prev = entitySnapshots[spec.kind] || {};
    const seen = new Set();
    const visit = (farmId, rec) => {
      if(!rec || !rec.id) return;
      seen.add(rec.id);
      const json = JSON.stringify(rec);
      if(prev[rec.id] !== json) enqueueSyncOp(spec.kind, 'upsert', { id:rec.id, farmId, data:rec });
    };
    if(spec.farmScoped){ Object.keys(farms).forEach(farmId => (spec.getArray(farms[farmId])||[]).forEach(rec=>visit(farmId, rec))); }
    else { (spec.getArray()||[]).forEach(rec => visit(rec[spec.farmField], rec)); }
    Object.keys(prev).forEach(id => { if(!seen.has(id)) enqueueSyncOp(spec.kind, 'delete', { id }); });
    entitySnapshots[spec.kind] = snapshotEntityArray(spec);
  });
}
// Busca do Supabase o que já está salvo de verdade (talhões, animais etc.)
// pra cada propriedade da conta, e preenche as listas — antes disso, essas
// listas ficavam vazias (dado de demonstração zerado) toda vez que a pessoa
// abria o app de novo, mesmo já tendo cadastrado tudo antes.
async function loadFarmSubEntitiesFromBackend(){
  if(!BACKEND_ENABLED || !currentAuthUser) return;
  const farmIds = Object.keys(farms);
  if(!farmIds.length) return;
  // As 10 buscas não dependem uma da outra, então rodam todas ao mesmo
  // tempo (antes eram uma de cada vez, esperando a anterior terminar —
  // bem mais lento, principalmente numa conexão de campo mais fraca).
  await Promise.all(SYNC_ENTITIES.map(async spec => {
    try{
      const { data, error } = await withTimeout(
        sb.from(spec.table).select('*').in('farm_id', farmIds).order('created_at', { ascending: spec.ascending }),
        12000
      );
      // Tabela ainda não criada no Supabase, algum erro pontual, ou
      // demorou demais — não trava o app; essa entidade simplesmente
      // continua vazia até a pessoa rodar o script SQL (ou até a próxima
      // tentativa automática, quando a conexão estiver melhor).
      if(error || !data) return;
      if(spec.farmScoped){
        data.forEach(row => { const f = farms[row.farm_id]; if(f) spec.getArray(f).push(row.data); });
      } else {
        const arr = spec.getArray();
        data.forEach(row => arr.push(row.data));
      }
    }catch(e){ /* ignora e segue pras outras entidades */ }
  }));
}
// Detecção de conexão de verdade (não é mais um botão de simulação).
window.addEventListener('online', ()=>{ isOffline = false; refreshSyncUI(); trySyncQueue(false); });
window.addEventListener('offline', ()=>{ isOffline = true; refreshSyncUI(); });
// As fileiras que arrastam pro lado (.filter-row — ex: Individual/Cadastro
// em lote, lista de propriedades — e .tabs-row — as abas da propriedade e
// do perfil do animal) só ganham o esmaecido nas pontas quando têm
// chip/aba sobrando fora da tela; senão fica sem esmaecido nenhum, pra não
// cortar/esconder nada que já cabe inteiro (era isso que causava um pedaço
// de aba com a borda cortada bem na ponta da fileira).
// Roda de novo sempre que algo muda na tela (novo sheet, troca de aba etc.),
// sem precisar chamar isso manualmente em cada função que desenha a tela.
function updateFilterRowMasks(){
  document.querySelectorAll('.filter-row, .tabs-row').forEach(el=>{
    el.classList.toggle('has-overflow', el.scrollWidth > el.clientWidth + 2);
  });
}
let _filterRowMaskTimer = null;
function scheduleFilterRowMaskUpdate(){
  clearTimeout(_filterRowMaskTimer);
  _filterRowMaskTimer = setTimeout(updateFilterRowMasks, 80);
}
window.addEventListener('resize', scheduleFilterRowMaskUpdate);
document.addEventListener('DOMContentLoaded', ()=>{
  new MutationObserver(scheduleFilterRowMaskUpdate).observe(document.body, {childList:true, subtree:true});
  scheduleFilterRowMaskUpdate();
});
// Se a aba ficar aberta muito tempo, tenta sincronizar periodicamente também
// (cobre o caso do navegador não disparar o evento 'online' corretamente).
setInterval(()=>{ if(navigator.onLine && pendingQueueCount()>0) trySyncQueue(false); }, 30000);

// Avisa a pessoa, atualiza o status e — esse é o ponto-chave — dispara a
// sincronização de verdade (reconcileLocalChanges). Toda tela que cadastra
// ou edita talhão, lote, animal, pasto, alimentação, insumo, máquina,
// atividade, custo ou registro de campo termina chamando esta função aqui;
// por isso ela é o lugar certo (e único) pra descobrir o que mudou e mandar
// pra fila offline, sem precisar mexer em cada uma dessas telas.
function registerChange(msg){
  showToast(msg);
  refreshSyncUI();
  reconcileLocalChanges();
}

// ---------------------------------------------------------------
// SHEET (bottom form) + TOAST + ID HELPER
// ---------------------------------------------------------------
let idCounter = 100;
// Antes gerava "a101", "a102"... só com um contador local. Isso funcionava
// enquanto nada era sincronizado, mas dois aparelhos offline ao mesmo tempo
// (ex: dono e um membro da equipe) podiam gerar o MESMO id pro contador
// deles começar do mesmo lugar — e aí um cadastro sobrescreveria o outro na
// hora de sincronizar. Agora cada id nasce com um pedaço aleatório + a hora
// exata, então dois aparelhos nunca geram o mesmo id por acidente.
function newId(prefix){
  idCounter++;
  const rnd = (crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g,'').slice(0,10) : (Math.random().toString(36).slice(2,10));
  return prefix + '_' + Date.now().toString(36) + rnd;
}
let sheetCloseTimer = null;
function openSheet(title, bodyHTML){
  if(typeof stopQRScanLoop==='function') stopQRScanLoop(); // sheet anterior podia ter a câmera do leitor de QR aberta
  clearTimeout(sheetCloseTimer);
  const overlay = document.getElementById('sheetOverlay');
  overlay.classList.remove('closing');
  document.getElementById('sheetTitle').textContent = title;
  document.getElementById('sheetBody').innerHTML = bodyHTML;
  overlay.classList.add('open');
}
function closeSheet(){
  if(typeof stopQRScanLoop==='function') stopQRScanLoop(); // garante que a câmera do leitor de QR é liberada ao fechar
  if(typeof closeDatePicker==='function') closeDatePicker(); // fecha o calendário se tinha ficado aberto por cima
  const overlay = document.getElementById('sheetOverlay');
  if(!overlay.classList.contains('open')) return;
  overlay.classList.add('closing');
  clearTimeout(sheetCloseTimer);
  sheetCloseTimer = setTimeout(()=>{
    overlay.classList.remove('open','closing');
  }, 180);
}
let toastTimer = null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  const sheetOpen = !!document.querySelector('.sheet-overlay.open');
  t.classList.toggle('above-sheet', sheetOpen);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 1800);
}
let successBurstTimer = null;
// Pequena celebração visual para conclusões importantes (ex: concluir uma atividade).
function showSuccessBurst(){
  const b = document.getElementById('successBurst');
  b.classList.remove('show');
  void b.offsetWidth; // força reflow para permitir replay da animação em conclusões seguidas
  b.classList.add('show');
  clearTimeout(successBurstTimer);
  successBurstTimer = setTimeout(()=>b.classList.remove('show'), 900);
}

// ---------------------------------------------------------------
// AUTENTICAÇÃO REAL (Supabase) — cadastro, login, logout
// ---------------------------------------------------------------
function setAuthMode(mode){
  document.getElementById('authTabLogin').classList.toggle('active', mode==='login');
  document.getElementById('authTabSignup').classList.toggle('active', mode==='signup');
  document.getElementById('authFormLogin').classList.toggle('active', mode==='login');
  document.getElementById('authFormSignup').classList.toggle('active', mode==='signup');
  hideAuthMsg();
}
function showAuthMsg(text, kind){
  const el = document.getElementById('authMsg');
  el.textContent = text;
  el.className = 'auth-msg show ' + (kind||'err');
}
function hideAuthMsg(){
  const el = document.getElementById('authMsg');
  el.className = 'auth-msg';
}
function showAuthOverlay(){
  document.getElementById('authOverlay').classList.add('open');
}
function hideAuthOverlay(){
  document.getElementById('authOverlay').classList.remove('open');
}
// Mostrado entre o login e a hora em que propriedades/talhões/animais etc.
// terminam de chegar do servidor — sem isso, a tela Início aparecia com
// "0 propriedades" por alguns segundos (ou bem mais, numa conexão ruim) e
// parecia que o cadastro tinha sumido, quando na verdade só estava carregando.
function showDataLoadingOverlay(){
  const el = document.getElementById('dataLoadingOverlay');
  if(el) el.classList.add('open');
}
function hideDataLoadingOverlay(){
  const el = document.getElementById('dataLoadingOverlay');
  if(el) el.classList.remove('open');
}
// Mostra/esconde a senha digitada — alterna o type do campo entre
// "password" (pontinhos) e "text" (visível), e o ícone do olho junto.
function togglePasswordVisibility(inputId, btn){
  const input = document.getElementById(inputId);
  if(!input) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.innerHTML = showing ? svgIcon('eye',{size:16}) : svgIcon('eye-off',{size:16});
  btn.classList.toggle('on', !showing);
  btn.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Esconder senha');
}
// Abre a tela de login/cadastro só para visualização — funciona mesmo sem o
// Supabase configurado, para você conferir o visual antes de ativar de verdade.
function previewAuthScreen(){
  document.getElementById('authPreviewNote').style.display = BACKEND_ENABLED ? 'none' : 'block';
  showAuthOverlay();
}
async function doSignIn(){
  if(!BACKEND_ENABLED){ showAuthMsg('Isso é só uma prévia visual. Preencha as chaves do Supabase no arquivo para o login funcionar de verdade (veja o guia).', 'ok'); return; }
  const email = document.getElementById('authLoginEmail').value.trim();
  const password = document.getElementById('authLoginPass').value;
  if(!email || !password){ showAuthMsg('Preencha e-mail e senha.'); return; }
  hideAuthMsg();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error){ showAuthMsg(traduzErroAuth(error)); return; }
  currentAuthUser = data.user;
  onAuthReady();
}
async function doSignUp(){
  if(!BACKEND_ENABLED){ showAuthMsg('Isso é só uma prévia visual. Preencha as chaves do Supabase no arquivo para o cadastro funcionar de verdade (veja o guia).', 'ok'); return; }
  const name = document.getElementById('authSignupName').value.trim();
  const email = document.getElementById('authSignupEmail').value.trim();
  const password = document.getElementById('authSignupPass').value;
  if(!name || !email || !password){ showAuthMsg('Preencha nome, e-mail e senha.'); return; }
  if(password.length < 6){ showAuthMsg('A senha precisa ter pelo menos 6 caracteres.'); return; }
  hideAuthMsg();
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: name }, emailRedirectTo: AGROOP_SITE_URL },
  });
  if(error){ showAuthMsg(traduzErroAuth(error)); return; }
  if(data.session){
    // Projeto com confirmação de e-mail desativada — já entra direto.
    currentAuthUser = data.user;
    onAuthReady();
  } else {
    // Comportamento padrão do Supabase: precisa confirmar o e-mail antes de logar.
    showAuthMsg(`Conta criada! Enviamos um link de confirmação para ${email} — confirme para poder entrar.`, 'ok');
    setAuthMode('login');
  }
}
async function doForgotPassword(){
  if(!BACKEND_ENABLED){ showAuthMsg('Isso é só uma prévia visual. Preencha as chaves do Supabase no arquivo para a recuperação de senha funcionar de verdade (veja o guia).', 'ok'); return; }
  const email = document.getElementById('authLoginEmail').value.trim();
  if(!email){ showAuthMsg('Digite seu e-mail no campo acima e toque em "Esqueci minha senha" de novo.'); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: AGROOP_SITE_URL });
  if(error){ showAuthMsg(traduzErroAuth(error)); return; }
  showAuthMsg(`Enviamos um link de redefinição de senha para ${email}.`, 'ok');
}
async function doSignOut(){
  if(!BACKEND_ENABLED){ hideAuthOverlay(); return; }
  await sb.auth.signOut();
  currentAuthUser = null;
  location.reload();
}
// Login com Google — o Supabase cuida de todo o vaivém com o Google; ao voltar,
// onAuthStateChange (em initAuthGate) já detecta a sessão nova e chama onAuthReady().
async function doGoogleLogin(){
  if(!BACKEND_ENABLED){ showAuthMsg('Isso é só uma prévia visual. Configure o Supabase e o provedor Google (veja o guia) para funcionar de verdade.', 'ok'); return; }
  if(IS_NATIVE_APP){
    // No app instalado, abrimos o Google numa aba própria (Chrome Custom
    // Tabs, ainda "dentro" do app do ponto de vista da pessoa) e cuidamos
    // nós mesmos de detectar a volta — ver initNativeAuthCallback().
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: AGROOP_OAUTH_REDIRECT, skipBrowserRedirect: true },
    });
    if(error){ showAuthMsg(traduzErroAuth(error)); return; }
    if(data && data.url && window.Capacitor.Plugins.Browser){
      await window.Capacitor.Plugins.Browser.open({ url: data.url });
    }
    return;
  }
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: AGROOP_SITE_URL } });
  if(error){ showAuthMsg(traduzErroAuth(error)); }
}
// Escuta a volta do login com Google quando rodando como app instalado: o
// Android abre este app de novo passando a URL de retorno, a gente fecha a
// aba do Google e troca o "código" que veio nela por uma sessão de verdade.
function initNativeAuthCallback(){
  if(!IS_NATIVE_APP || !BACKEND_ENABLED || !window.Capacitor.Plugins.App) return;
  window.Capacitor.Plugins.App.addListener('appUrlOpen', async ({ url })=>{
    if(!url || url.indexOf('login-callback') === -1) return;
    try{ await window.Capacitor.Plugins.Browser.close(); }catch(e){}
    const codeMatch = url.match(/[?&]code=([^&]+)/);
    if(!codeMatch){
      const msgMatch = url.match(/[?&]error_description=([^&]+)/);
      if(msgMatch) showAuthMsg(decodeURIComponent(msgMatch[1]).replace(/\+/g,' '));
      return;
    }
    const { error } = await sb.auth.exchangeCodeForSession(decodeURIComponent(codeMatch[1]));
    if(error){ showAuthMsg(traduzErroAuth(error)); }
    // onAuthStateChange (em initAuthGate) detecta a sessão nova e chama onAuthReady() sozinho.
  });
}
function traduzErroAuth(error){
  const msg = (error && error.message) || '';
  if(msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if(msg.includes('User already registered')) return 'Já existe uma conta com este e-mail. Toque em "Entrar".';
  if(msg.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if(msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).';
  if(msg.includes('Token has expired') || msg.includes('Invalid OTP') || msg.includes('Invalid token')) return 'Código incorreto ou expirado. Toque em "Enviar código" para receber um novo.';
  if(msg.includes('provider is not enabled') || msg.includes('Unsupported provider')) return 'O login com Google ainda não foi ativado no projeto Supabase.';
  return msg || 'Não foi possível completar a ação. Tente novamente.';
}
// Converte uma linha da tabela "farms" do Supabase no formato de objeto
// que o resto do app já sabe usar (mesmo formato dos dados de demonstração).
function dbFarmToAppFarm(row){
  const iconByType = {agro:'🌱', pec:'🐄', mista:'🌤️'};
  const colorByType = {agro:'var(--agro)', pec:'var(--pec)', mista:'var(--sky)'};
  const displayName = (currentAuthUser && currentAuthUser.user_metadata && currentAuthUser.user_metadata.full_name) || (currentAuthUser && currentAuthUser.email) || 'Você';
  return {
    id: row.id, name: row.name, city: row.city || '—', state: row.state || '—', type: row.type,
    color: colorByType[row.type], icon: iconByType[row.type],
    area: `${row.area_ha} ha`, coords: row.coords || '—', photoUrl: row.photo_url || null, description: row.description || '',
    team: [`${displayName} — Proprietário`],
    weather: {temp:26, cond:'Sem dados ainda', icon:'❔', updated:'—', rain:0},
    talhoes:[], lotes:[], animals:[], pastures:[], feed:[], inputs:[], machines:[],
  };
}
// Busca as propriedades reais do cliente logado e substitui os dados de
// demonstração por elas (cada cliente só recebe as suas, graças ao RLS).
// Nenhuma busca no Supabase aqui tinha um limite de tempo — numa conexão
// ruim ou instável (bem comum no campo, ou trocando de wifi pra dados
// móveis), o navegador podia ficar esperando vários MINUTOS por uma
// resposta antes de desistir sozinho. Como o login espera tudo isso em
// sequência antes de mostrar a tela, ela ficava presa em "0 propriedades"
// até isso se resolver — dando a impressão de que os cadastros tinham
// sumido, quando só estavam esperando a rede. Isso dá um limite curto e
// razoável (12s) pra cada busca, e segue em frente com o que já tinha
// (ou vazio) se estourar — a próxima tentativa automática de sincronização
// completa o que faltou.
function withTimeout(promise, ms){
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(()=>resolve({ data:null, error:new Error('tempo esgotado') }), ms)),
  ]);
}
async function loadFarmsFromBackend(){
  if(!BACKEND_ENABLED || !currentAuthUser) return;
  const { data, error } = await withTimeout(sb.from('farms').select('*').order('created_at', { ascending: true }), 12000);
  // Com uma conta de verdade logada, os dados de demonstração (Fazenda Santa
  // Fé, Boa Esperança etc.) nunca devem aparecer — nem quando a busca falha.
  // Antes, um erro aqui (ex: tabela/RLS com problema) deixava esses dados
  // fictícios na tela para QUALQUER conta, como se fossem reais. Agora, some
  // com eles de qualquer forma; se der erro, o cliente só fica sem nada
  // cadastrado (o correto), em vez de ver a fazenda de outra pessoa.
  Object.keys(farms).forEach(k => delete farms[k]);
  // Atividades e notificações de demonstração apontam para as propriedades
  // fictícias (ex: "santafe") — zera tudo aqui, na hora, pra essa demonstração
  // nunca aparecer misturada com dados reais. Talhões, lotes, animais,
  // atividades e custos de verdade são recarregados logo em seguida por
  // loadFarmSubEntitiesFromBackend() (chamada por finishAuthFlow), depois que
  // as propriedades reais (acima) já existem em farms — notificações continuam
  // geradas localmente a partir desses dados, sem tabela própria.
  activities.length = 0;
  notifications.length = 0;
  costLedger.length = 0;
  fieldRecords.length = 0;
  if(error){ showToast('Não foi possível carregar suas propriedades agora.'); return; }
  (data||[]).forEach(row => { farms[row.id] = dbFarmToAppFarm(row); });
}
// Carrega a equipe de verdade (convites pendentes + pessoas que já aceitaram)
// da conta logada, substituindo a lista fixa de demonstração (Marcos Lima,
// Dra. Ana Souza etc.) que aparecia para qualquer conta. Se o script SQL do
// convite ainda não tiver sido rodado no Supabase, as consultas abaixo falham
// silenciosamente e a equipe simplesmente mostra só o próprio dono por
// enquanto — não trava o app.
async function loadTeamFromBackend(){
  if(!BACKEND_ENABLED || !currentAuthUser) return;
  const meta = currentAuthUser.user_metadata || {};
  const ownerName = (meta.nickname && meta.nickname.trim()) || meta.full_name || currentAuthUser.email || 'Você';
  const owner = { id:'u1', name: ownerName, role:'Proprietário', access:'Administrador', fixed:true, status:'ativo' };
  const list = [owner];
  try{
    const { data: invites } = await withTimeout(sb.from('account_invites').select('*').eq('owner_id', currentAuthUser.id).neq('status', 'aceito').order('created_at', { ascending: true }), 12000);
    (invites||[]).forEach(inv => {
      list.push({ id:'inv_'+inv.id, inviteId: inv.id, code: inv.code, name: inv.invited_name, role: inv.role, access: inv.access, channel: inv.channel, contact: inv.contact, status: inv.status==='revogado' ? 'revogado' : 'pendente' });
    });
  }catch(e){ /* tabela account_invites ainda não existe — ignora */ }
  try{
    const { data: team } = await withTimeout(sb.rpc('get_account_team'), 12000);
    (team||[]).forEach(t => {
      list.push({ id:'mem_'+t.member_id, memberId: t.member_id, name: t.full_name || t.email || 'Membro da equipe', role: t.role, access: t.access, status:'ativo' });
    });
  }catch(e){ /* função get_account_team ainda não existe — ignora */ }
  teamMembers = list;
  if(!teamMembers.find(x=>x.id===currentViewMemberId)) currentViewMemberId = 'u1';
  updateTeamSummary();
  updateAccessBanner();
}
// Gera um código de convite curto e fácil de digitar (sem caracteres
// ambíguos como 0/O ou 1/I).
function generateInviteCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'AG-';
  for(let i=0;i<6;i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}
// Verifica se a pessoa chegou no app a partir de um link de convite
// (?invite=CODIGO) e, se o código for válido, mostra a tela de aceite.
async function checkPendingInvite(){
  if(!pendingInviteCode || !BACKEND_ENABLED || !currentAuthUser) return;
  const code = pendingInviteCode;
  try{
    const { data, error } = await sb.rpc('get_account_invite_preview', { p_code: code });
    if(error || !data || !data.length){
      showToast('Este convite não foi encontrado ou já expirou.');
      pendingInviteCode = null;
      clearInviteFromUrl();
      return;
    }
    const info = data[0];
    if(info.status === 'aceito'){
      showToast('Este convite já foi aceito.');
      pendingInviteCode = null;
      clearInviteFromUrl();
      return;
    }
    const farmPart = info.farm_count ? ` em ${info.farm_count} propriedade${info.farm_count!==1?'s':''}` : '';
    openSheet('Convite para o AGROOP', `
      <p style="font-size:13px;line-height:1.6;color:var(--ink);margin:0 0 16px;">
        <b>${info.owner_name}</b> te convidou para acessar o AGROOP como <b>${info.role}</b> (${info.access})${farmPart}.
      </p>
      <button class="sheet-save" onclick="acceptPendingInvite('${code}')">Aceitar convite</button>
      <button class="fab-btn ghost" style="width:100%;margin-top:8px;justify-content:center;" onclick="declinePendingInvite()">Agora não</button>
    `);
  }catch(e){
    // RPC ainda não existe no banco (SQL não rodado) — não incomoda a pessoa com erro.
    pendingInviteCode = null;
  }
}
function clearInviteFromUrl(){
  try{
    const url = new URL(location.href);
    url.searchParams.delete('invite');
    history.replaceState({}, '', url.toString());
  }catch(e){}
}
async function acceptPendingInvite(code){
  try{
    const { error } = await sb.rpc('accept_account_invite', { p_code: code });
    if(error){ showToast('Não foi possível aceitar o convite agora. Tente de novo.'); return; }
    pendingInviteCode = null;
    clearInviteFromUrl();
    closeSheet();
    showToast('Convite aceito! Carregando as propriedades…');
    await finishAuthFlow();
  }catch(e){
    showToast('Não foi possível aceitar o convite agora. Tente de novo.');
  }
}
function declinePendingInvite(){
  pendingInviteCode = null;
  clearInviteFromUrl();
  closeSheet();
}
// Re-renderiza todas as telas que dependem da lista de propriedades.
function refreshAllScreens(){
  renderHome();
  renderHomeWeatherSelect();
  renderWeatherCard('homeWeatherCard', homeWeatherFarmId);
  renderDesktopWeatherCard(homeWeatherFarmId);
  renderPropFilters();
  renderPropertiesList();
  renderActivitiesList();
  renderNotifications();
  renderReports();
  fetchAllFarmsWeather();
}
// Atualiza o nome/avatar exibidos (saudação da Início e cartão da tela Mais)
// com os dados reais da conta logada, em vez do "Luiz Henrique" fixo.
function updateProfileUIFromAuth(){
  if(!currentAuthUser) return;
  const meta = currentAuthUser.user_metadata || {};
  const fullName = meta.full_name || currentAuthUser.email || currentAuthUser.phone || 'Você';
  // Na saudação, prioriza como a pessoa disse que quer ser chamada
  // (definido no primeiro acesso); sem isso, cai no primeiro nome.
  const displayName = (meta.nickname && meta.nickname.trim()) || fullName.split(' ')[0];
  const initialsText = fullName.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'VC';
  const farmCount = Object.keys(farms).length;
  const greetNameEl = document.getElementById('greetName');
  if(greetNameEl) greetNameEl.textContent = displayName;
  const profileNameEl = document.getElementById('profileName');
  if(profileNameEl) profileNameEl.textContent = fullName;
  const photoUrl = currentProfileRow && currentProfileRow.photo_url;
  setAvatarVisual(document.getElementById('profileAvatar'), photoUrl, initialsText);
  const profileSubEl = document.getElementById('profileSub');
  if(profileSubEl) profileSubEl.textContent = `Proprietário · ${farmCount} propriedade${farmCount!==1?'s':''}`;
}
// Rótulo amigável de como a pessoa entrou na conta (e-mail, Google ou telefone).
function authProviderLabel(user){
  const provider = user && user.app_metadata && user.app_metadata.provider;
  if(provider === 'google') return 'Conta Google';
  if(provider === 'phone') return 'Login por telefone';
  if(provider === 'email') return 'E-mail e senha';
  return 'Modo demonstração';
}
// Guarda a foto de perfil escolhida (base64) até o momento de salvar.
let _pendingProfilePhoto = undefined; // undefined = não mexeu na foto; null = removeu; string = nova foto
// Perfil salvo no Supabase (tabela "profiles"), incluindo foto/e-mail/telefone
// de contato — carregado no login (ver loadProfileFromBackend).
let currentProfileRow = null;
// No modo demonstração as edições não têm onde ser salvas de verdade, então
// ficam só na memória desta sessão (voltam ao padrão se a página recarregar).
let demoProfileOverrides = { photoUrl: null, email: '', phone: '' };
// Aplica foto (se houver) ou as iniciais num círculo de avatar.
function setAvatarVisual(el, photoUrl, initials){
  if(!el) return;
  if(photoUrl){
    el.style.backgroundImage = `url('${photoUrl}')`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.textContent = '';
  } else {
    el.style.backgroundImage = '';
    el.textContent = initials;
  }
}
async function loadProfileFromBackend(){
  if(!BACKEND_ENABLED || !currentAuthUser) return;
  // Nunca deixa um problema aqui (rede, RLS, etc.) travar o resto do login —
  // pior caso, o perfil detalhado (foto/e-mail/telefone) fica em branco até
  // a próxima tentativa, mas as propriedades do cliente continuam carregando.
  try{
    const { data, error } = await sb.from('profiles').select('*').eq('id', currentAuthUser.id).single();
    if(!error) currentProfileRow = data || null;
  } catch(e){
    currentProfileRow = null;
  }
}
function handleProfilePhotoInput(inputEl){
  const file = inputEl.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    // Antes de aplicar a foto, abre o editor para a pessoa ajustar zoom/posição.
    openPhotoCropEditor(e.target.result);
  };
  reader.readAsDataURL(file);
  inputEl.value = ''; // permite escolher o mesmo arquivo de novo depois de cancelar
}
// Área de perfil do usuário — foto, nome, e-mail e telefone de contato, e,
// se o login for por e-mail, trocar a senha.
function openProfileSheet(){
  _pendingProfilePhoto = undefined;
  const loggedIn = BACKEND_ENABLED && !!currentAuthUser;
  const nameFallback = document.getElementById('profileName').textContent || 'Luiz Henrique';
  const fullName = loggedIn ? ((currentAuthUser.user_metadata && currentAuthUser.user_metadata.full_name) || '') : nameFallback;
  const initialsText = fullName.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'LH';
  const providerLabel = authProviderLabel(loggedIn ? currentAuthUser : null);
  const emailValue = loggedIn ? ((currentProfileRow && currentProfileRow.email) || currentAuthUser.email || '') : demoProfileOverrides.email;
  const phoneValue = loggedIn ? ((currentProfileRow && currentProfileRow.phone) || currentAuthUser.phone || '') : demoProfileOverrides.phone;
  const photoUrl = loggedIn ? (currentProfileRow && currentProfileRow.photo_url) : demoProfileOverrides.photoUrl;
  const isEmailLogin = loggedIn && currentAuthUser.app_metadata && currentAuthUser.app_metadata.provider === 'email';
  openSheet('Meu perfil', `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="position:relative;width:64px;height:64px;margin:0 auto 10px;">
        <div class="profile-avatar" id="pf_avatar_preview" style="width:64px;height:64px;font-size:22px;background:var(--brand);color:#fff;cursor:pointer;border:3px solid #fff;box-shadow:var(--card-shadow);-webkit-backdrop-filter:none;backdrop-filter:none;" onclick="viewProfilePhoto()" title="${photoUrl?'Ver foto':'Adicionar foto'}">${photoUrl?'':initialsText}</div>
        <label for="pf_photo_input" class="avatar-camera-badge" title="Trocar foto">${CAMERA_SVG}</label>
        <input type="file" id="pf_photo_input" accept="image/*" style="display:none;" onchange="handleProfilePhotoInput(this)">
      </div>
      <span class="status-chip dados">${providerLabel}</span>
    </div>
    <div class="form-field"><label>Nome completo</label><input id="pf_name" value="${escapeAttr(fullName)}"></div>
    <div class="form-field"><label>E-mail</label><input id="pf_email" type="email" value="${escapeAttr(emailValue)}" placeholder="seu@email.com"></div>
    <div class="form-field"><label>Telefone</label><input id="pf_phone" type="tel" value="${escapeAttr(phoneValue)}" placeholder="+55 11 91234-5678"></div>
    ${!loggedIn ? `<div class="empty-note">Isso é uma prévia — entre com uma conta real (veja o guia do Supabase) para salvar essas alterações de verdade.</div>` : ''}
    <button class="sheet-save" onclick="saveProfile()">Salvar alterações</button>
    ${isEmailLogin ? `
      <div class="h-eyebrow" style="padding:16px 0 6px;">Segurança</div>
      <div class="form-field"><label>Nova senha</label><input id="pf_new_pass" type="password" placeholder="Deixe em branco para não alterar"></div>
      <button class="sheet-save" style="background:#fff;color:var(--brand-dark);border:1px solid var(--border);" onclick="saveProfilePassword()">Alterar senha</button>
    ` : ''}
  `);
  setAvatarVisual(document.getElementById('pf_avatar_preview'), photoUrl, initialsText);
}
function escapeAttr(str){
  return String(str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
async function saveProfile(){
  const newName = document.getElementById('pf_name').value.trim();
  const newEmail = document.getElementById('pf_email').value.trim();
  const newPhone = document.getElementById('pf_phone').value.trim();
  if(!newName){ showToast('Digite um nome.'); return; }
  if(BACKEND_ENABLED && currentAuthUser){
    const { data, error } = await sb.auth.updateUser({ data: { full_name: newName } });
    if(error){ showToast('Não foi possível salvar agora. Tente de novo.'); return; }
    currentAuthUser = data.user;
    const photoUrl = _pendingProfilePhoto !== undefined ? _pendingProfilePhoto : (currentProfileRow && currentProfileRow.photo_url) || null;
    // "upsert" em vez de "update": se a pessoa ainda não tem uma linha na
    // tabela "profiles" (comum em quem cadastrou antes dessa tabela existir,
    // ou se nunca foi criada uma linha no cadastro), um "update" simplesmente
    // não faz nada — sem dar erro — e foto/e-mail/telefone pareciam salvar
    // (o app mostrava tudo certo na hora) mas sumiam ao entrar de novo, porque
    // nunca tinham sido gravados de verdade. "upsert" cria a linha se ela não
    // existir, e atualiza se já existir.
    const { error: profileError } = await sb.from('profiles').upsert({
      id: currentAuthUser.id, full_name: newName, email: newEmail || null, phone: newPhone || null, photo_url: photoUrl,
    }, { onConflict: 'id' });
    currentProfileRow = { ...(currentProfileRow||{}), full_name: newName, email: newEmail || null, phone: newPhone || null, photo_url: photoUrl };
    _pendingProfilePhoto = undefined;
    updateProfileUIFromAuth();
    closeSheet();
    if(profileError){
      showToast('Nome salvo. Foto/e-mail/telefone não foram salvos agora — tente de novo com internet.');
    } else {
      showToast('Perfil atualizado.');
    }
  } else {
    // Modo demonstração: reflete só visualmente, nesta sessão (sem back-end para salvar).
    if(_pendingProfilePhoto !== undefined) demoProfileOverrides.photoUrl = _pendingProfilePhoto;
    demoProfileOverrides.email = newEmail;
    demoProfileOverrides.phone = newPhone;
    const initialsText = newName.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() || 'LH';
    const greetNameEl = document.getElementById('greetName'); if(greetNameEl) greetNameEl.textContent = newName.split(' ')[0];
    const profileNameEl = document.getElementById('profileName'); if(profileNameEl) profileNameEl.textContent = newName;
    setAvatarVisual(document.getElementById('profileAvatar'), demoProfileOverrides.photoUrl, initialsText);
    _pendingProfilePhoto = undefined;
    closeSheet();
    showToast('Perfil atualizado nesta sessão (prévia).');
  }
}
async function saveProfilePassword(){
  const newPass = document.getElementById('pf_new_pass').value;
  if(!newPass){ showToast('Digite a nova senha.'); return; }
  if(newPass.length < 6){ showToast('A senha precisa ter pelo menos 6 caracteres.'); return; }
  const { error } = await sb.auth.updateUser({ password: newPass });
  if(error){ showToast('Não foi possível alterar a senha agora. Tente de novo.'); return; }
  closeSheet();
  showToast('Senha alterada com sucesso.');
}
// Chamado assim que existe uma sessão válida (login, cadastro ou sessão já salva no navegador)
async function onAuthReady(){
  hideAuthOverlay();
  const logoutItem = document.getElementById('logoutMenuItem');
  if(logoutItem){
    logoutItem.style.display = 'flex';
    const label = document.getElementById('loggedInAsLabel');
    if(label && currentAuthUser) label.textContent = `Conectado como ${currentAuthUser.email || currentAuthUser.phone || 'você'}`;
  }
  await loadProfileFromBackend();
  updateProfileUIFromAuth();
  // Primeiro acesso: ainda não sabemos como a pessoa quer ser chamada nem a
  // idade dela — pede isso antes de liberar o resto do app. Depois que essa
  // informação existe na conta (user_metadata.nickname), nunca mais aparece,
  // seja o login por e-mail ou por Google.
  const meta = currentAuthUser.user_metadata || {};
  if(!meta.nickname){
    showOnboardingOverlay();
    return;
  }
  await finishAuthFlow();
}
// Segunda metade do login (carregar propriedades e liberar o app) — separada
// do onAuthReady porque, no primeiro acesso, só roda depois que a pessoa
// preenche a tela de boas-vindas (ver completeOnboarding).
async function finishAuthFlow(){
  // Mostra "Carregando seus dados..." em vez de deixar a tela Início
  // aparecendo zerada (0 propriedades etc.) enquanto isso tudo ainda está
  // sendo buscado — numa conexão ruim isso pode demorar bem mais que o
  // normal, e sem esse aviso parecia que os cadastros tinham sumido.
  showDataLoadingOverlay();
  try{
    await loadFarmsFromBackend();
    // Carrega talhões, lotes, animais, pastos, alimentação, insumos,
    // máquinas, atividades, custos e registros de campo já salvos de
    // verdade — antes, essas listas ficavam sempre vazias a cada abertura
    // do app, mesmo com tudo cadastrado (essa era a "Fase 3" pendente).
    await loadFarmSubEntitiesFromBackend();
    await loadTeamFromBackend();
    // Recoloca na tela qualquer cadastro que ainda está esperando conexão pra
    // ser enviado (ex: a pessoa cadastrou uma propriedade offline, fechou o
    // app, e reabriu antes da sincronização acontecer) — sem isso, o cadastro
    // continuaria seguro na fila, mas sumiria da tela até sincronizar.
    mergePendingQueueIntoLocalState();
    // Só DEPOIS de carregar o que já está no servidor e recolocar o que
    // ainda está pendente é que "fotografamos" o estado atual — assim a
    // sincronização automática (reconcileLocalChanges, chamada por
    // registerChange) não confunde esses dados que acabaram de chegar com
    // cadastros novos e tenta reenviar tudo de novo pro servidor.
    primeEntitySnapshots();
    trySyncQueue(false); // envia qualquer cadastro que ficou pendente de uma sessão offline anterior
    refreshAllScreens();
    updateProfileUIFromAuth(); // recalcula a contagem de propriedades já com os dados reais (e a foto, se houver)
    updateStatusClockAndGreeting(); // já reflete "Feliz aniversário" hoje, se a data de nascimento já estiver salva
    // Propriedades, talhões, lotes, animais, pastos, alimentação, insumos,
    // máquinas, atividades, custos e registros de campo já são 100% reais e
    // isolados por cliente a partir daqui. Notificações continuam calculadas
    // localmente a partir desses dados reais (não têm tabela própria ainda).
    // Se a pessoa chegou aqui a partir de um link de convite (?invite=CODIGO),
    // mostra a tela de aceite em vez do toast padrão de login.
    if(pendingInviteCode){
      await checkPendingInvite();
    } else {
      const farmCount = Object.keys(farms).length;
      showToast(farmCount>0
        ? 'Login realizado — suas propriedades já estão salvas de verdade.'
        : 'Conta pronta! Cadastre sua primeira propriedade para começar.');
    }
  } finally {
    // Sempre esconde, mesmo se algo acima falhar — senão a pessoa fica
    // presa atrás do "Carregando..." pra sempre em vez de ver o app (com o
    // que já tinha antes de sincronizar, no pior caso).
    hideDataLoadingOverlay();
  }
}
// Tela de boas-vindas do primeiro acesso — pré-preenche o que já vier da
// conta (ex: nome do Google) e deixa a pessoa ajustar como quer ser chamada.
function showOnboardingOverlay(){
  const meta = currentAuthUser.user_metadata || {};
  const fullNameEl = document.getElementById('onbFullName');
  if(fullNameEl) fullNameEl.value = meta.full_name || '';
  const nicknameEl = document.getElementById('onbNickname');
  if(nicknameEl) nicknameEl.value = meta.nickname || (meta.full_name ? meta.full_name.split(' ')[0] : '');
  const birthdateEl = document.getElementById('onbBirthdate');
  if(birthdateEl) birthdateEl.value = meta.birthdate || '';
  hideOnboardingMsg();
  document.getElementById('onboardingOverlay').classList.add('open');
}
function hideOnboardingOverlay(){
  document.getElementById('onboardingOverlay').classList.remove('open');
}
function showOnboardingMsg(text){
  const el = document.getElementById('onbMsg');
  if(el){ el.textContent = text; el.className = 'auth-msg show err'; }
}
function hideOnboardingMsg(){
  const el = document.getElementById('onbMsg');
  if(el) el.className = 'auth-msg';
}
async function completeOnboarding(){
  const nickname = document.getElementById('onbNickname').value.trim();
  const fullName = document.getElementById('onbFullName').value.trim();
  const birthdate = document.getElementById('onbBirthdate').value; // "YYYY-MM-DD" ou ''
  if(!nickname || !fullName){ showOnboardingMsg('Preencha como quer ser chamado(a) e seu nome completo.'); return; }
  if(birthdate){
    const todayStr = new Date().toISOString().slice(0,10);
    const minStr = '1900-01-01';
    if(birthdate > todayStr || birthdate < minStr){ showOnboardingMsg('Digite uma data de nascimento válida.'); return; }
  }
  hideOnboardingMsg();
  const { data, error } = await sb.auth.updateUser({ data: { full_name: fullName, nickname, birthdate: birthdate || null } });
  if(error){ showOnboardingMsg('Não foi possível salvar agora. Tente de novo.'); return; }
  currentAuthUser = data.user;
  // Mantém o nome completo espelhado na tabela "profiles" também, no mesmo
  // padrão usado no resto do app (edição de perfil). Se a coluna de e-mail/
  // telefone já tiver algo salvo, não mexe nelas aqui.
  try{ await sb.from('profiles').upsert({ id: currentAuthUser.id, full_name: fullName }, { onConflict: 'id' }); }catch(e){}
  hideOnboardingOverlay();
  updateProfileUIFromAuth();
  updateStatusClockAndGreeting(); // já reflete "Feliz aniversário" hoje, se for o caso
  await finishAuthFlow();
}
// Verifica se hoje é o aniversário da pessoa logada (compara só dia/mês —
// não guardamos/expomos a idade em lugar nenhum, só a data de nascimento).
function isUserBirthdayToday(){
  const meta = currentAuthUser && currentAuthUser.user_metadata;
  const bd = meta && meta.birthdate;
  if(!bd) return false;
  const parts = bd.split('-');
  if(parts.length !== 3) return false;
  const now = new Date();
  return parseInt(parts[1],10) === (now.getMonth()+1) && parseInt(parts[2],10) === now.getDate();
}
// A tela de carregamento fica visível pelo menos esse tempo, mesmo quando o
// login salvo responde na hora — sem isso, em conexão rápida ela sumia
// rápido demais pra dar tempo de ver a animação (é só uma logo "piscando").
const BOOT_MIN_MS = 2000;
// Esconde a tela de carregamento (ver #bootScreen no index.html) assim que
// o app já sabe o que mostrar — login ou a Início — respeitando o tempo
// mínimo acima, e nunca sumindo cedo demais nem mostrando a tela pela metade.
function hideBootScreen(){
  const el = document.getElementById('bootScreen');
  if(!el) return;
  const elapsed = Date.now() - (window.__bootStart || Date.now());
  const wait = Math.max(0, BOOT_MIN_MS - elapsed);
  setTimeout(()=>{
    el.classList.add('hide');
    setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 400);
  }, wait);
}
async function initAuthGate(){
  if(!BACKEND_ENABLED){ hideBootScreen(); return; } // modo demonstração: nenhuma tela de login é exibida
  const { data } = await sb.auth.getSession();
  hideBootScreen();
  if(data.session){
    currentAuthUser = data.session.user;
    onAuthReady();
  } else {
    showAuthOverlay();
  }
  sb.auth.onAuthStateChange((event, session)=>{
    if(event === 'SIGNED_IN' && session){
      currentAuthUser = session.user;
      onAuthReady();
    } else if(event === 'SIGNED_OUT'){
      currentAuthUser = null;
      showAuthOverlay();
    }
  });
}

// ---------------------------------------------------------------
// CRUD FORMS — tudo mantido em memória (sem back-end próprio), como
// convém a um protótipo navegável; ver Fase 3 do plano de evolução
// para a conexão completa dos dados ao Supabase.
// ---------------------------------------------------------------
let _pendingFarmPhoto = null;
function handleFarmPhotoInput(inputEl, previewId){
  const file = inputEl.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    _pendingFarmPhoto = e.target.result;
    const prev = document.getElementById(previewId);
    if(prev) prev.innerHTML = `<img src="${_pendingFarmPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
  };
  reader.readAsDataURL(file);
}
// Unidades de área usadas na região rural brasileira — tudo é convertido e
// guardado internamente em hectares (é o que o resto do app espera/calcula),
// mas o cadastro aceita o valor na unidade que o produtor já usa no dia a dia.
const AREA_UNITS = {
  ha:    {label:'Hectares (ha)',              toHa:1},
  alqpta:{label:'Alqueire paulista',          toHa:2.42},
  alqmg: {label:'Alqueirão (mineiro/goiano)', toHa:4.84},
};
function updateAreaHint(valueId, unitId, hintId){
  const v = parseFloat(document.getElementById(valueId).value);
  const unit = document.getElementById(unitId).value;
  const hintEl = document.getElementById(hintId);
  if(!hintEl) return;
  if(!v || unit==='ha'){ hintEl.textContent = ''; return; }
  const ha = v * AREA_UNITS[unit].toHa;
  hintEl.textContent = `≈ ${ha.toLocaleString('pt-BR', {maximumFractionDigits:2})} ha`;
}
// Menu de unidade de área (ha / alqueire paulista / alqueirão), com o mesmo
// visual do resto do app — usado no cadastro de propriedade, talhão e pasto.
function areaUnitSelectHTML(id, selectedValue, onChangeFnName){
  const options = Object.entries(AREA_UNITS).map(([k,u])=>({value:k, label:u.label}));
  return styledSelectHTML(id, options, selectedValue||'ha', onChangeFnName?{onChange:onChangeFnName}:undefined);
}
function _onAreaUnitChange_nf(){ updateAreaHint('nf_area','nf_area_unit','nf_area_hint'); }
function _onAreaUnitChange_nt(){ updateAreaHint('nt_area','nt_area_unit','nt_area_hint'); }
function _onAreaUnitChange_np(){ updateAreaHint('np_area','np_area_unit','np_area_hint'); }
function openAddFarmForm(){
  _pendingFarmPhoto = null;
  openSheet('Nova propriedade', `
    <div class="form-field"><label>Nome da fazenda</label><input id="nf_name" placeholder="Ex: Fazenda Água Limpa"></div>
    <div class="form-row2">
      <div class="form-field"><label>Cidade</label><input id="nf_city" placeholder="Cidade"></div>
      <div class="form-field"><label>UF</label><input id="nf_state" maxlength="2" placeholder="UF"></div>
    </div>
    <div class="form-field"><label>Tipo</label>
      ${styledSelectHTML('nf_type', [{value:'agro',label:'Agricultura'},{value:'pec',label:'Pecuária'},{value:'mista',label:'Mista'}], 'agro')}
    </div>
    <div class="form-row2">
      <div class="form-field"><label>Área</label><input id="nf_area" type="number" inputmode="decimal" placeholder="Ex: 300" oninput="updateAreaHint('nf_area','nf_area_unit','nf_area_hint')"></div>
      <div class="form-field"><label>Unidade</label>
        ${areaUnitSelectHTML('nf_area_unit', 'ha', '_onAreaUnitChange_nf')}
      </div>
    </div>
    <div id="nf_area_hint" style="font-size:10.5px;color:var(--ink-muted);margin:-7px 0 11px;"></div>
    <div class="form-field">
      <label>Localização da propriedade (opcional)</label>
      <div style="display:flex;gap:6px;">
        <input id="nf_addr" placeholder="Buscar por cidade, bairro ou endereço" style="flex:1;">
        <button type="button" class="icon-btn-sm" style="width:auto;padding:0 12px;" onclick="searchAddressForCoords('nf')">Buscar</button>
      </div>
      <div id="nf_addr_results"></div>
      <div id="nf_map" class="coord-map" style="margin-top:8px;"></div>
      <button type="button" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:8px;" onclick="useMyLocationForCoords('nf')">${LOCATION_SVG} Usar minha localização atual</button>
      <input id="nf_coords" placeholder="-15.000, -50.000" style="margin-top:8px;" onchange="onCoordsTextInput('nf')">
      <div id="nf_coords_hint" style="font-size:10.5px;color:var(--ink-muted);margin-top:4px;">Busque pelo endereço, toque no mapa, use sua localização atual, ou digite as coordenadas.</div>
    </div>
    <div class="form-field"><label>Foto da propriedade (opcional)</label>
      <div style="display:flex;align-items:center;gap:10px;">
        <div id="nf_photo_preview" style="width:56px;height:56px;border-radius:10px;background:#eee;flex:0 0 auto;"></div>
        <input type="file" id="nf_photo" accept="image/*" onchange="handleFarmPhotoInput(this,'nf_photo_preview')">
      </div>
    </div>
    <div class="form-field"><label>Descrição (opcional)</label>
      <textarea id="nf_desc" rows="3" placeholder="Ex: Propriedade de cria e recria, dividida em 6 piquetes, com sede na entrada da fazenda."></textarea>
      <button type="button" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:6px;padding:7px;" onclick="startVoiceDictation('nf_desc', this)">🎙️ Ditar por voz</button>
    </div>
    <button class="sheet-save" onclick="saveNewFarm()">Salvar propriedade</button>
  `);
  setTimeout(()=>initCoordMap('nf', null), 150);
}
async function saveNewFarm(){
  if(!requireAccess('Editor', 'cadastrar uma nova propriedade')) return;
  const name = document.getElementById('nf_name').value.trim();
  if(!name){ showToast('Dê um nome para a propriedade'); return; }
  const city = titleCasePt(document.getElementById('nf_city').value.trim()) || '—';
  const state = document.getElementById('nf_state').value.trim().toUpperCase() || '—';
  const type = document.getElementById('nf_type').value;
  const areaRaw = parseFloat(document.getElementById('nf_area').value) || 0;
  const areaUnit = document.getElementById('nf_area_unit').value;
  const areaHa = Math.round(areaRaw * (AREA_UNITS[areaUnit]?.toHa || 1) * 100) / 100;
  const coords = document.getElementById('nf_coords').value.trim() || '—';
  const description = (document.getElementById('nf_desc').value || '').trim();
  const iconByType = {agro:'🌱', pec:'🐄', mista:'🌤️'};
  const colorByType = {agro:'var(--agro)', pec:'var(--pec)', mista:'var(--sky)'};
  const photoUrl = _pendingFarmPhoto;

  let id = newId('farm');
  let ownerLabel = 'Luiz Henrique — Proprietário';
  let pendingSync = false;

  // Com o backend real configurado e o cliente logado, a propriedade é
  // gravada de verdade no Supabase (isolada por RLS) em vez de só na memória.
  // Sem conexão (ou se a gravação falhar por causa da conexão), ela fica
  // guardada no aparelho e entra na fila pra ser enviada assim que a
  // internet voltar — em vez de simplesmente travar o cadastro.
  if(BACKEND_ENABLED && currentAuthUser){
    const insertData = { owner_id: currentAuthUser.id, name, city, state, type, area_ha: areaHa, coords, photo_url: photoUrl, description: description || null };
    const displayName = (currentAuthUser.user_metadata && currentAuthUser.user_metadata.full_name) || currentAuthUser.email;
    ownerLabel = `${displayName} — Proprietário`;

    if(!navigator.onLine){
      pendingSync = true;
      enqueueSyncOp('farm', 'insert', { tempId: id, insertData });
    } else {
      try{
        const { data, error } = await sb.from('farms').insert(insertData).select().single();
        if(error){
          if(looksLikeNetworkError(error)){
            pendingSync = true;
            enqueueSyncOp('farm', 'insert', { tempId: id, insertData });
          } else {
            showToast('Não foi possível salvar a propriedade: ' + (error.message || 'tente de novo.'));
            return;
          }
        } else {
          id = data.id;
        }
      }catch(e){
        pendingSync = true;
        enqueueSyncOp('farm', 'insert', { tempId: id, insertData });
      }
    }
  }

  farms[id] = {
    id, name, city, state, type, color:colorByType[type], icon:iconByType[type], photoUrl,
    area: areaHa+' ha', coords, description,
    team:[ownerLabel],
    weather:{temp:26, cond:'Sem dados ainda', icon:'❔', updated:'—', rain:0},
    talhoes:[], lotes:[], animals:[], pastures:[], feed:[], inputs:[], machines:[],
    pendingSync,
  };
  _pendingFarmPhoto = null;
  closeSheet();
  renderHome(); renderPropertiesList();
  if(BACKEND_ENABLED && currentAuthUser) updateProfileUIFromAuth();
  if(pendingSync){
    showToast(`Sem conexão — "${name}" foi salva no aparelho e será enviada assim que a internet voltar.`);
    refreshSyncUI();
  } else {
    registerChange(`Propriedade "${name}" cadastrada`);
  }
}
const DOWNLOAD_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M12 3v12"/><polyline points="7 11 12 16 17 11"/><path d="M5 19h14"/></svg>`;
const CAMERA_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5l1.7-2.4c.2-.3.5-.4.8-.4h5c.3 0 .6.1.8.4L16.5 6H20a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.6"/></svg>`;
const CS_CHEVRON_SVG = `<svg class="cs-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><polyline points="6 9 12 15 18 9"/></svg>`;

// ---------------------------------------------------------------
// CUSTOM SELECT — dropdown com o visual do app no lugar do <select>
// nativo (o menu que o navegador/celular abre não dá pra restylizar
// via CSS; isto monta um menu próprio mas mantém o mesmo "onChange").
// ---------------------------------------------------------------
function customSelectHTML(id, options, selectedValue, onChangeFnName, opts){
  const compact = opts && opts.compact;
  const sel = options.find(o=>String(o.value)===String(selectedValue));
  const label = sel ? sel.label : ((opts&&opts.placeholder)||'Selecionar');
  const optsHTML = options.map(o=>
    `<div class="custom-select-opt ${String(o.value)===String(selectedValue)?'sel':''}" onclick="event.stopPropagation();chooseCustomSelect('${id}','${String(o.value).replace(/'/g,"\\'")}','${onChangeFnName}')">${o.label}</div>`
  ).join('');
  return `<div class="custom-select${compact?' compact':''}" id="${id}">
    <button type="button" class="custom-select-trigger" onclick="event.stopPropagation();toggleCustomSelect('${id}')"><span>${label}</span>${CS_CHEVRON_SVG}</button>
    <div class="custom-select-menu">${optsHTML}</div>
  </div>`;
}
function closeAllCustomSelects(){
  document.querySelectorAll('.custom-select.open').forEach(elm=>elm.classList.remove('open'));
}
function toggleCustomSelect(id){
  const el = document.getElementById(id);
  if(!el) return;
  const wasOpen = el.classList.contains('open');
  closeAllCustomSelects();
  if(!wasOpen) el.classList.add('open');
}
function chooseCustomSelect(id, value, onChangeFnName){
  closeAllCustomSelects();
  if(onChangeFnName && typeof window[onChangeFnName]==='function') window[onChangeFnName](value);
}
// Versão do menu acima pensada pra substituir, sem quebrar nada, os <select>
// nativos espalhados pelos formulários — aqueles que o celular ainda estava
// desenhando com o próprio visual (a caixa branca simples com bolinha de
// rádio, fora do padrão do resto do app). Em vez de guardar o valor
// escolhido numa variável nova (como o customSelectHTML acima exige),
// guarda num <input type="hidden"> com o MESMO id que o campo já tinha —
// assim toda tela que lê document.getElementById('id').value continua
// funcionando exatamente igual, e só o desenho do menu muda.
function styledSelectHTML(id, options, selectedValue, opts){
  opts = opts || {};
  const wrapId = id + '_cs';
  const sel = options.find(o=>String(o.value)===String(selectedValue));
  const val = sel ? sel.value : (options[0] ? options[0].value : '');
  const label = sel ? sel.label : (options[0] ? options[0].label : (opts.placeholder||'Selecionar'));
  const optsHTML = options.map(o=>
    `<div class="custom-select-opt ${String(o.value)===String(val)?'sel':''}" data-v="${String(o.value).replace(/"/g,'&quot;')}" onclick="event.stopPropagation();chooseStyledSelect('${id}','${String(o.value).replace(/'/g,"\\'")}'${opts.onChange?`,'${opts.onChange}'`:''})">${o.label}</div>`
  ).join('');
  return `<div class="custom-select${opts.compact?' compact':''}" id="${wrapId}">
    <input type="hidden" id="${id}" value="${String(val).replace(/"/g,'&quot;')}">
    <button type="button" class="custom-select-trigger" onclick="event.stopPropagation();toggleCustomSelect('${wrapId}')"><span>${label}</span>${CS_CHEVRON_SVG}</button>
    <div class="custom-select-menu">${optsHTML}</div>
  </div>`;
}
function chooseStyledSelect(id, value, onChangeFnName){
  const hidden = document.getElementById(id);
  if(hidden) hidden.value = value;
  const wrap = document.getElementById(id+'_cs');
  if(wrap){
    let matchedLabel = null;
    wrap.querySelectorAll('.custom-select-opt').forEach(o=>{
      const isMatch = o.getAttribute('data-v')===String(value);
      o.classList.toggle('sel', isMatch);
      if(isMatch) matchedLabel = o.textContent;
    });
    const trigger = wrap.querySelector('.custom-select-trigger span');
    if(trigger && matchedLabel!=null) trigger.textContent = matchedLabel;
  }
  closeAllCustomSelects();
  if(onChangeFnName && typeof window[onChangeFnName]==='function') window[onChangeFnName](value);
}
// Mesma ideia do styledSelectHTML acima, mas para os poucos campos que usavam
// <optgroup> (opções agrupadas por categoria, ex: tipo de atividade do animal)
// — mantém os grupos visíveis como títulos dentro do menu.
function styledSelectGroupedHTML(id, groups, selectedValue, opts){
  opts = opts || {};
  const wrapId = id + '_cs';
  let flatOptions = [];
  groups.forEach(g=>{ g.options.forEach(o=>flatOptions.push(o)); });
  const sel = flatOptions.find(o=>String(o.value)===String(selectedValue));
  const val = sel ? sel.value : (flatOptions[0] ? flatOptions[0].value : '');
  const label = sel ? sel.label : (flatOptions[0] ? flatOptions[0].label : (opts.placeholder||'Selecionar'));
  const menuHTML = groups.map(g=>`
    <div class="custom-select-group-label" style="padding:6px 12px 2px;font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--ink-muted);">${g.label}</div>
    ${g.options.map(o=>
      `<div class="custom-select-opt ${String(o.value)===String(val)?'sel':''}" data-v="${String(o.value).replace(/"/g,'&quot;')}" onclick="event.stopPropagation();chooseStyledSelect('${id}','${String(o.value).replace(/'/g,"\\'")}'${opts.onChange?`,'${opts.onChange}'`:''})">${o.label}</div>`
    ).join('')}
  `).join('');
  return `<div class="custom-select${opts.compact?' compact':''}" id="${wrapId}">
    <input type="hidden" id="${id}" value="${String(val).replace(/"/g,'&quot;')}">
    <button type="button" class="custom-select-trigger" onclick="event.stopPropagation();toggleCustomSelect('${wrapId}')"><span>${label}</span>${CS_CHEVRON_SVG}</button>
    <div class="custom-select-menu">${menuHTML}</div>
  </div>`;
}
document.addEventListener('click', ()=>closeAllCustomSelects());
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAllCustomSelects(); });
// ---------------------------------------------------------------
// CALENDÁRIO — substitui o <input type="date"> nativo (cada celular desenha
// diferente, e no Android costuma vir com um visual bem antigo) por um
// calendário com a cara do app. Mesma ideia do styledSelectHTML: o valor
// escolhido fica num <input type="hidden"> com o MESMO id que o campo de
// data já tinha, então toda tela que lê document.getElementById('id').value
// (no formato aaaa-mm-dd, igual o <input type="date"> nativo já devolvia)
// continua funcionando sem precisar mudar nada nas funções de salvar.
// ---------------------------------------------------------------
const DP_CAL_SVG = `<svg class="dp-cal-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>`;
function fmtDateFull(iso){
  const dt = parseISO(iso);
  if(!dt) return '';
  return `${String(dt.getDate()).padStart(2,'0')} de ${MESES_PT_LONG[dt.getMonth()].toLowerCase()} de ${dt.getFullYear()}`;
}
function styledDateHTML(id, value, opts){
  opts = opts || {};
  const placeholder = opts.placeholder || 'Selecionar data';
  const hasValue = !!value;
  const label = hasValue ? fmtDateFull(value) : placeholder;
  return `<div class="date-field" id="${id}_wrap">
    <input type="hidden" id="${id}" value="${value||''}" ${opts.onChange?`data-onchange="${opts.onChange}"`:''}>
    <button type="button" class="date-field-trigger${hasValue?'':' placeholder'}" data-placeholder="${placeholder.replace(/"/g,'&quot;')}" onclick="openDatePicker('${id}')">
      <span>${label}</span>${DP_CAL_SVG}
    </button>
  </div>`;
}
let _dpState = null;
function openDatePicker(targetId){
  const input = document.getElementById(targetId);
  if(!input) return;
  const current = parseISO(input.value) || APP_TODAY;
  _dpState = { targetId, viewYear: current.getFullYear(), viewMonth: current.getMonth(), selectedISO: input.value || null, view: 'days' };
  dpRender();
  document.getElementById('datePickerOverlay').classList.add('open');
}
function closeDatePicker(){
  document.getElementById('datePickerOverlay').classList.remove('open');
  _dpState = null;
}
// Alterna entre a grade de dias, a grade de meses (ao tocar no nome do mês no
// título) e a grade de anos (ao tocar no ano) — igual o seletor nativo antigo
// permitia, só que com o visual do calendário novo.
function dpOpenView(view){
  if(!_dpState) return;
  _dpState.view = view;
  if(view==='years'){
    _dpState.yearsPageStart = _dpState.viewYear - 5;
  }
  dpRender();
}
function dpChangeMonth(delta){
  if(!_dpState) return;
  const view = _dpState.view || 'days';
  if(view==='years'){
    _dpState.yearsPageStart += delta*12;
    dpRender();
    return;
  }
  if(view==='months'){
    _dpState.viewYear += delta;
    dpRender();
    return;
  }
  _dpState.viewMonth += delta;
  if(_dpState.viewMonth<0){ _dpState.viewMonth=11; _dpState.viewYear--; }
  if(_dpState.viewMonth>11){ _dpState.viewMonth=0; _dpState.viewYear++; }
  dpRender();
}
function dpRender(){
  if(!_dpState) return;
  const view = _dpState.view || 'days';
  const titleMonthEl = document.getElementById('dpTitleMonth');
  const titleYearEl = document.getElementById('dpTitleYear');
  const weekdaysEl = document.getElementById('dpWeekdays');
  const gridEl = document.getElementById('dpGrid');
  weekdaysEl.style.display = view==='days' ? '' : 'none';
  weekdaysEl.innerHTML = DIAS_SEMANA_PT.map(d=>`<span>${d}</span>`).join('');
  if(view==='days'){
    titleMonthEl.style.display = '';
    titleMonthEl.textContent = MESES_PT_LONG[_dpState.viewMonth];
    titleYearEl.textContent = _dpState.viewYear;
    dpRenderDaysGrid(gridEl);
  } else if(view==='months'){
    titleMonthEl.style.display = 'none';
    titleYearEl.textContent = _dpState.viewYear;
    dpRenderMonthsGrid(gridEl);
  } else if(view==='years'){
    titleMonthEl.style.display = 'none';
    titleYearEl.textContent = `${_dpState.yearsPageStart} – ${_dpState.yearsPageStart+11}`;
    dpRenderYearsGrid(gridEl);
  }
}
function dpRenderDaysGrid(gridEl){
  const { viewYear, viewMonth, selectedISO } = _dpState;
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const todayISO = isoToday();
  let cells = '';
  for(let i=0;i<firstWeekday;i++) cells += `<div class="dp-day empty"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cls = ['dp-day'];
    if(iso===todayISO) cls.push('today');
    if(iso===selectedISO) cls.push('selected');
    cells += `<button type="button" class="${cls.join(' ')}" onclick="dpSelectDay('${iso}')">${d}</button>`;
  }
  gridEl.className = 'dp-grid';
  gridEl.innerHTML = cells;
}
function dpRenderMonthsGrid(gridEl){
  const { viewMonth, viewYear, selectedISO } = _dpState;
  const selDate = selectedISO ? parseISO(selectedISO) : null;
  let cells = '';
  for(let m=0; m<12; m++){
    const cls = ['dp-month'];
    if(m===viewMonth) cls.push('selected');
    if(selDate && selDate.getFullYear()===viewYear && selDate.getMonth()===m) cls.push('has-value');
    cells += `<button type="button" class="${cls.join(' ')}" onclick="dpPickMonth(${m})">${MESES_PT_LONG[m].slice(0,3)}</button>`;
  }
  gridEl.className = 'dp-grid dp-grid-months';
  gridEl.innerHTML = cells;
}
function dpRenderYearsGrid(gridEl){
  const { viewYear, yearsPageStart, selectedISO } = _dpState;
  const selDate = selectedISO ? parseISO(selectedISO) : null;
  let cells = '';
  for(let i=0; i<12; i++){
    const y = yearsPageStart + i;
    const cls = ['dp-year'];
    if(y===viewYear) cls.push('selected');
    if(selDate && selDate.getFullYear()===y) cls.push('has-value');
    cells += `<button type="button" class="${cls.join(' ')}" onclick="dpPickYear(${y})">${y}</button>`;
  }
  gridEl.className = 'dp-grid dp-grid-years';
  gridEl.innerHTML = cells;
}
function dpPickMonth(m){
  if(!_dpState) return;
  _dpState.viewMonth = m;
  _dpState.view = 'days';
  dpRender();
}
function dpPickYear(y){
  if(!_dpState) return;
  _dpState.viewYear = y;
  _dpState.view = 'days';
  dpRender();
}
function dpSelectDay(iso){
  if(!_dpState) return;
  const input = document.getElementById(_dpState.targetId);
  if(!input) return;
  input.value = iso;
  const wrap = document.getElementById(_dpState.targetId+'_wrap');
  if(wrap){
    const btn = wrap.querySelector('.date-field-trigger');
    if(btn){ btn.classList.remove('placeholder'); btn.querySelector('span').textContent = fmtDateFull(iso); }
  }
  const onChangeFn = input.getAttribute('data-onchange');
  closeDatePicker();
  if(onChangeFn && typeof window[onChangeFn]==='function') window[onChangeFn](iso);
}
function dpGoToday(){
  if(!_dpState) return;
  const t = APP_TODAY;
  _dpState.viewYear = t.getFullYear();
  _dpState.viewMonth = t.getMonth();
  _dpState.selectedISO = isoToday();
  _dpState.view = 'days';
  dpRender();
  dpSelectDay(isoToday());
}
function dpClearAndClose(){
  if(!_dpState) return;
  const input = document.getElementById(_dpState.targetId);
  if(input){
    input.value = '';
    const wrap = document.getElementById(_dpState.targetId+'_wrap');
    if(wrap){
      const btn = wrap.querySelector('.date-field-trigger');
      if(btn){ btn.classList.add('placeholder'); btn.querySelector('span').textContent = btn.getAttribute('data-placeholder')||'Selecionar data'; }
    }
    const onChangeFn = input.getAttribute('data-onchange');
    if(onChangeFn && typeof window[onChangeFn]==='function') window[onChangeFn]('');
  }
  closeDatePicker();
}
// Lightbox simples para ampliar qualquer foto (perfil, propriedade etc.) sem
// mexer no sheet aberto por baixo — é uma camada separada, então abrir/fechar
// nunca perde o que a pessoa já tinha digitado num formulário aberto.
function openPhotoLightbox(url){
  if(!url) return;
  document.getElementById('photoLightboxImg').src = url;
  document.getElementById('photoLightbox').classList.add('open');
}
function closePhotoLightbox(){
  document.getElementById('photoLightbox').classList.remove('open');
}
// ---- Editor de foto de perfil: arrastar para posicionar + slider de zoom ----
// Aparece assim que a pessoa escolhe uma imagem nova, antes de virar a foto de
// perfil definitiva. O resultado final é recortado num canvas quadrado, então
// funciona igual em qualquer navegador, sem depender de biblioteca externa.
const CROP_STAGE_SIZE = 220; // precisa bater com .photo-crop-stage no CSS
let _cropState = null;   // { natW, natH, baseScale, scaleMult, offX, offY }
let _cropDrag = null;    // { startX, startY, offX, offY } enquanto arrasta

function openPhotoCropEditor(dataUrl){
  const probe = new Image();
  probe.onload = ()=>{
    const natW = probe.naturalWidth, natH = probe.naturalHeight;
    // "cover": a foto sempre preenche o círculo inteiro, sem sobrar fundo vazio.
    const baseScale = Math.max(CROP_STAGE_SIZE/natW, CROP_STAGE_SIZE/natH);
    const dispW = natW*baseScale, dispH = natH*baseScale;
    _cropState = {
      natW, natH, baseScale, scaleMult: 1,
      offX: (CROP_STAGE_SIZE-dispW)/2, offY: (CROP_STAGE_SIZE-dispH)/2,
    };
    document.getElementById('photoCropImg').src = dataUrl;
    document.getElementById('photoCropZoom').value = 100;
    applyCropTransform();
    document.getElementById('photoCropOverlay').classList.add('open');
  };
  probe.src = dataUrl;
}
function currentCropScale(){ return _cropState.baseScale * _cropState.scaleMult; }
function clampCropOffsets(){
  const s = currentCropScale();
  const dispW = _cropState.natW*s, dispH = _cropState.natH*s;
  const minX = Math.min(0, CROP_STAGE_SIZE-dispW), minY = Math.min(0, CROP_STAGE_SIZE-dispH);
  _cropState.offX = Math.min(0, Math.max(minX, _cropState.offX));
  _cropState.offY = Math.min(0, Math.max(minY, _cropState.offY));
}
function applyCropTransform(){
  if(!_cropState) return;
  const s = currentCropScale();
  const img = document.getElementById('photoCropImg');
  img.style.width = (_cropState.natW*s)+'px';
  img.style.height = (_cropState.natH*s)+'px';
  img.style.left = _cropState.offX+'px';
  img.style.top = _cropState.offY+'px';
}
function onCropZoomChange(val){
  if(!_cropState) return;
  const oldScale = currentCropScale();
  // Mantém o centro do quadro fixo enquanto o zoom muda (não "pula" a imagem).
  const c = CROP_STAGE_SIZE/2;
  const relX = (c - _cropState.offX)/oldScale, relY = (c - _cropState.offY)/oldScale;
  _cropState.scaleMult = Number(val)/100;
  const newScale = currentCropScale();
  _cropState.offX = c - relX*newScale;
  _cropState.offY = c - relY*newScale;
  clampCropOffsets();
  applyCropTransform();
}
function cropDragStart(e){
  if(!_cropState) return;
  const pt = e.touches ? e.touches[0] : e;
  _cropDrag = { startX: pt.clientX, startY: pt.clientY, offX: _cropState.offX, offY: _cropState.offY };
  e.preventDefault();
}
function cropDragMove(e){
  if(!_cropDrag || !_cropState) return;
  const pt = e.touches ? e.touches[0] : e;
  _cropState.offX = _cropDrag.offX + (pt.clientX - _cropDrag.startX);
  _cropState.offY = _cropDrag.offY + (pt.clientY - _cropDrag.startY);
  clampCropOffsets();
  applyCropTransform();
  e.preventDefault();
}
function cropDragEnd(){ _cropDrag = null; }
document.addEventListener('mousemove', cropDragMove);
document.addEventListener('mouseup', cropDragEnd);
document.addEventListener('touchmove', cropDragMove, {passive:false});
document.addEventListener('touchend', cropDragEnd);
function cancelPhotoCrop(){
  document.getElementById('photoCropOverlay').classList.remove('open');
  _cropState = null; _cropDrag = null;
}
function confirmPhotoCrop(){
  if(!_cropState) return;
  const s = currentCropScale();
  const OUT = 400; // resolução final salva, já num quadrado
  const canvas = document.createElement('canvas');
  canvas.width = OUT; canvas.height = OUT;
  const ctx = canvas.getContext('2d');
  const sx = -_cropState.offX / s, sy = -_cropState.offY / s, sSize = CROP_STAGE_SIZE / s;
  ctx.drawImage(document.getElementById('photoCropImg'), sx, sy, sSize, sSize, 0, 0, OUT, OUT);
  const finalUrl = canvas.toDataURL('image/jpeg', 0.9);
  _pendingProfilePhoto = finalUrl;
  setAvatarVisual(document.getElementById('pf_avatar_preview'), finalUrl, '');
  document.getElementById('photoCropOverlay').classList.remove('open');
  _cropState = null; _cropDrag = null;
}
// Círculo do avatar: se já tem foto, amplia; se não tem, já abre o seletor de arquivo.
function viewProfilePhoto(){
  const bg = document.getElementById('pf_avatar_preview').style.backgroundImage;
  const match = /url\(["']?(.*?)["']?\)/.exec(bg || '');
  const url = match ? match[1] : null;
  if(url) openPhotoLightbox(url);
  else document.getElementById('pf_photo_input').click();
}
function openFarmPhotoViewer(farmId){
  const f = farms[farmId];
  if(!f.photoUrl) return;
  const filename = f.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'propriedade';
  openSheet(f.name, `
    <img src="${f.photoUrl}" style="width:100%;border-radius:14px;display:block;margin-bottom:12px;" alt="Foto de ${f.name}">
    <a class="sheet-save" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;box-sizing:border-box;" href="${f.photoUrl}" download="${filename}.jpg">${DOWNLOAD_SVG}Baixar foto</a>
  `);
}
function openChangeFarmPhoto(farmId){
  openSheet('Alterar foto da propriedade', `
    <div style="display:flex;align-items:center;gap:10px;">
      <div id="cfp_preview" style="width:56px;height:56px;border-radius:10px;background:#eee;flex:0 0 auto;"></div>
      <input type="file" id="cfp_photo" accept="image/*" onchange="handleFarmPhotoInput(this,'cfp_preview')">
    </div>
    <button class="sheet-save" onclick="saveChangeFarmPhoto('${farmId}')">Salvar foto</button>
  `);
}
function saveChangeFarmPhoto(farmId){
  if(!_pendingFarmPhoto){ showToast('Escolha uma foto'); return; }
  farms[farmId].photoUrl = _pendingFarmPhoto;
  _pendingFarmPhoto = null;
  closeSheet();
  renderPropertyTab(); renderHome(); renderPropertiesList();
  registerChange(`Foto da propriedade "${farms[farmId].name}" atualizada`);
}

function openAddTalhaoForm(farmId){
  openSheet('Novo talhão', `
    <div class="form-field"><label>Nome do talhão</label><input id="nt_name" placeholder="Ex: Talhão 8 — Soja"></div>
    <div class="form-row2">
      <div class="form-field"><label>Área</label><input id="nt_area" type="number" inputmode="decimal" placeholder="Ex: 60" oninput="updateAreaHint('nt_area','nt_area_unit','nt_area_hint')"></div>
      <div class="form-field"><label>Unidade</label>${areaUnitSelectHTML('nt_area_unit', 'ha', '_onAreaUnitChange_nt')}</div>
    </div>
    <div id="nt_area_hint" style="font-size:10.5px;color:var(--ink-muted);margin:-7px 0 11px;"></div>
    <div class="form-field"><label>Estágio</label><input id="nt_stage" placeholder="Ex: Vegetativo"></div>
    <div class="form-row2">
      <div class="form-field"><label>Cultura</label><input id="nt_cultura" placeholder="Ex: Soja"></div>
      <div class="form-field"><label>Cultivar / variedade</label><input id="nt_variedade" placeholder="Ex: TMG 7062"></div>
    </div>
    <div class="form-field"><label>Safra</label><input id="nt_safra" placeholder="Ex: 2026/27"></div>
    <div class="form-row2">
      <div class="form-field"><label>Data de plantio (opcional)</label>${styledDateHTML('nt_plantio', '')}</div>
      <div class="form-field"><label>Previsão de colheita (opcional)</label>${styledDateHTML('nt_colheita', '')}</div>
    </div>
    <div class="form-field"><label>Próxima operação a monitorar</label>
      ${styledSelectHTML('nt_optype', [{value:'',label:'Nenhuma (ex: pousio)'},{value:'Plantio',label:'Plantio'},{value:'Pulverização',label:'Pulverização'},{value:'Colheita',label:'Colheita'}], '')}
    </div>
    <div class="form-field"><label>Classificação inicial</label>
      ${styledSelectHTML('nt_status', [
        {value:'dados',label:'Dados insuficientes'},
        {value:'favoravel',label:'Favorável'},
        {value:'atencao',label:'Atenção'},
        {value:'desfavoravel',label:'Desfavorável'},
      ], 'dados')}
    </div>
    <div class="form-field"><label>Atividade vinculada</label><input id="nt_activity" placeholder="Ex: Plantio — 20 ago"></div>
    <div class="form-field"><label>Responsável</label><input id="nt_resp" placeholder="Nome do responsável"></div>
    <button class="sheet-save" onclick="saveNewTalhao('${farmId}')">Salvar talhão</button>
  `);
}
function saveNewTalhao(farmId){
  const name = document.getElementById('nt_name').value.trim();
  if(!name){ showToast('Dê um nome para o talhão'); return; }
  const f = farms[farmId];
  const ntAreaRaw = parseFloat(document.getElementById('nt_area').value) || 0;
  const ntAreaUnit = document.getElementById('nt_area_unit').value;
  const ntAreaHa = Math.round(ntAreaRaw * (AREA_UNITS[ntAreaUnit]?.toHa || 1) * 100) / 100;
  const t = {
    id:newId('t'), name, area: ntAreaHa,
    cultura: document.getElementById('nt_cultura').value.trim()||'—',
    variedade: document.getElementById('nt_variedade').value.trim()||'—',
    safra: document.getElementById('nt_safra').value.trim()||'—',
    dataPlantio: document.getElementById('nt_plantio').value||null,
    previsaoColheita: document.getElementById('nt_colheita').value||null,
    operationType: document.getElementById('nt_optype').value||null,
    stage: document.getElementById('nt_stage').value.trim() || '—',
    status: document.getElementById('nt_status').value,
    reason: 'Classificação inicial definida no cadastro — será recalculada com base no clima recebido.',
    nextWindow: null,
    activity: document.getElementById('nt_activity').value.trim() || '—',
    responsible: document.getElementById('nt_resp').value.trim() || '—',
    updated: 'agora', pestLog:[], applications:[], cropHistory:[],
  };
  f.talhoes.push(t);
  closeSheet();
  renderPropertyTab(); renderHome();
  registerChange(`Talhão "${name}" adicionado em ${f.name}`);
}

function openAddLoteForm(farmId){
  openSheet('Novo lote', `
    <div class="form-field"><label>Nome do lote</label><input id="nl_name" placeholder="Ex: Lote 6 — Cria"></div>
    <div class="form-row2">
      <div class="form-field"><label>Categoria</label><input id="nl_cat" placeholder="Ex: Vacas"></div>
      <div class="form-field"><label>Quantidade</label><input id="nl_qty" placeholder="Ex: 40"></div>
    </div>
    <div class="form-field"><label>Pasto</label><input id="nl_pasture" placeholder="Ex: Pasto Central"></div>
    <button class="sheet-save" onclick="saveNewLote('${farmId}')">Salvar lote</button>
  `);
}
function saveNewLote(farmId){
  const name = document.getElementById('nl_name').value.trim();
  if(!name){ showToast('Dê um nome para o lote'); return; }
  const f = farms[farmId];
  f.lotes.push({id:newId('l'), name, category:document.getElementById('nl_cat').value.trim()||'—',
    qty: parseInt(document.getElementById('nl_qty').value)||0, pasture:document.getElementById('nl_pasture').value.trim()||'—'});
  closeSheet();
  renderPropertyTab(); renderHome();
  registerChange(`Lote "${name}" adicionado em ${f.name}`);
}

// ---------------------------------------------------------------
// PASTAGENS — cadastro, taxa de lotação e situação (rotação)
// ---------------------------------------------------------------
function openAddPastureForm(farmId){
  openSheet('Novo pasto', `
    <div class="form-field"><label>Nome do pasto</label><input id="np_name" placeholder="Ex: Pasto Central"></div>
    <div class="form-row2">
      <div class="form-field"><label>Área</label><input id="np_area" type="number" inputmode="decimal" placeholder="Ex: 45" oninput="updateAreaHint('np_area','np_area_unit','np_area_hint')"></div>
      <div class="form-field"><label>Unidade</label>${areaUnitSelectHTML('np_area_unit', 'ha', '_onAreaUnitChange_np')}</div>
    </div>
    <div id="np_area_hint" style="font-size:10.5px;color:var(--ink-muted);margin:-7px 0 11px;"></div>
    <div class="form-field"><label>Capacidade (cabeças)</label><input id="np_capacity" type="number" placeholder="Ex: 70"></div>
    <button class="sheet-save" onclick="savePasture('${farmId}')">Salvar pasto</button>
  `);
}
function savePasture(farmId){
  const name = document.getElementById('np_name').value.trim();
  if(!name){ showToast('Dê um nome para o pasto'); return; }
  const f = farms[farmId];
  f.pastures = f.pastures || [];
  const npAreaRaw = parseFloat(document.getElementById('np_area').value) || 0;
  const npAreaUnit = document.getElementById('np_area_unit').value;
  const npAreaHa = Math.round(npAreaRaw * (AREA_UNITS[npAreaUnit]?.toHa || 1) * 100) / 100;
  f.pastures.push({id:newId('p'), name, area:npAreaHa,
    capacity:parseInt(document.getElementById('np_capacity').value)||0, status:'Em uso', enteredDate:isoToday()});
  closeSheet();
  renderPropertyTab();
  registerChange(`Pasto "${name}" cadastrado em ${f.name}`);
}
// ---------------------------------------------------------------
// PASTEJO ROTACIONADO — a partir da capacidade (cab.) e de há quanto tempo
// o pasto está "Em uso" sem rotação planejada, calcula um alerta simples:
// lotação acima/perto da capacidade, ou tempo de pastejo contínuo alto
// demais (referência geral de manejo rotacionado — o produtor conhece
// melhor o próprio pasto e pode ajustar).
// ---------------------------------------------------------------
const PASTURE_MAX_GRAZING_DAYS = 30;
function pastureStockingAlert(p, count){
  if(p.capacity && count > p.capacity){
    return {level:'critico', text:`⚠ Lotação acima da capacidade (${count}/${p.capacity} cab.) — considere mover animais ou planejar rotação agora.`};
  }
  const daysGrazing = p.enteredDate ? daysBetween(p.enteredDate, isoToday()) : null;
  if(p.status==='Em uso' && !p.nextRotation && daysGrazing!=null && daysGrazing >= PASTURE_MAX_GRAZING_DAYS){
    return {level:'atencao', text:`🔄 ${daysGrazing} dias de pastejo contínuo sem rotação planejada — o pasto pode estar se esgotando, vale planejar o descanso.`};
  }
  if(p.capacity && count >= p.capacity*0.9 && count <= p.capacity){
    return {level:'atencao', text:`Perto da capacidade (${count}/${p.capacity} cab.) — bom momento pra planejar a próxima rotação.`};
  }
  return null;
}
function togglePastureStatus(farmId, pastureId){
  const p = farms[farmId].pastures.find(x=>x.id===pastureId);
  p.status = p.status==='Em uso' ? 'Descanso' : 'Em uso';
  p.enteredDate = isoToday();
  renderPropertyTab();
  registerChange(`Pasto "${p.name}" marcado como ${p.status}`);
}
function openPlanRotationForm(farmId, pastureId){
  const f = farms[farmId];
  const p = f.pastures.find(x=>x.id===pastureId);
  const targetOptions = [{value:'',label:'— A definir —'}].concat((f.pastures||[]).filter(x=>x.id!==pastureId).map(x=>({value:x.name,label:x.name})));
  openSheet('Planejar rotação — ' + p.name, `
    <div class="form-field"><label>Data planejada da próxima rotação</label>${styledDateHTML('pr_date', p.nextRotation||'')}</div>
    <div class="form-field"><label>Pasto de destino</label>${styledSelectHTML('pr_target', targetOptions, '')}</div>
    <button class="sheet-save" onclick="savePlanRotation('${farmId}','${pastureId}')">Salvar planejamento</button>
  `);
}
function savePlanRotation(farmId, pastureId){
  const date = document.getElementById('pr_date').value;
  if(!date){ showToast('Escolha uma data'); return; }
  const p = farms[farmId].pastures.find(x=>x.id===pastureId);
  p.nextRotation = date;
  p.nextRotationTarget = document.getElementById('pr_target').value || null;
  closeSheet();
  renderPropertyTab();
  registerChange(`Rotação planejada para "${p.name}" em ${fmtDate(date)}`);
}

// ---------------------------------------------------------------
// SANIDADE DO REBANHO — alertas de vacina/vermífugo/medicamento
// atrasados e animais em carência (seção "Manejo sanitário")
// ---------------------------------------------------------------
let sanidadeTab = 'proximas';
function openSanidadeSheet(farmId){
  sanidadeTab = 'proximas';
  renderSanidadeBody(farmId);
}
function setSanidadeTab(tab, farmId){
  sanidadeTab = tab;
  renderSanidadeBody(farmId);
}
function renderSanidadeBody(farmId){
  const f = farms[farmId];
  const rows = [];
  f.animals.forEach(a=>{
    animalHealthTasks(a).forEach(t=>{
      rows.push({a, task:t});
    });
  });
  rows.sort((x,y)=> (x.task.days??999) - (y.task.days??999));

  const historyRows = [];
  f.animals.forEach(a=>{
    (a.history||[]).forEach(h=>{
      if(h.t==='Vacina'||h.t==='Vermífugo'||h.t==='Medicamento') historyRows.push({a, h});
    });
  });
  historyRows.sort((x,y)=> y.h.d.localeCompare(x.h.d));

  const tabsHTML = `<div class="filter-row" style="padding:0 0 10px;">
    <button class="chip-btn ${sanidadeTab==='proximas'?'active':''}" onclick="setSanidadeTab('proximas','${farmId}')">Próximas doses</button>
    <button class="chip-btn ${sanidadeTab==='historico'?'active':''}" onclick="setSanidadeTab('historico','${farmId}')">Histórico</button>
  </div>`;

  const bannerHTML = `<div class="empty-note" style="background:#eaf4fb;color:#1f6fa8;border-color:#c9e3f5;text-align:left;display:flex;align-items:flex-start;gap:6px;"><span style="flex:none;margin-top:1px;">${svgIcon('warning',{size:13})}</span><span>A próxima dose é calculada automaticamente com base no protocolo e na última aplicação.</span></div>`;

  const proximasHTML = rows.length ? rows.map(r=>{
    const overdue = r.task.days!=null && r.task.days<0;
    const dueTxt = r.task.days==null ? 'sem data prevista' : overdue ? `atrasada há ${Math.abs(r.task.days)} dia(s)` : `Falta ${r.task.days} dia(s)`;
    return `<div class="talhao-card" onclick="closeSheet(); openAnimal('${f.id}','${r.a.id}')">
      <div class="talhao-top">
        <span class="talhao-name">${r.a.brinco} — ${r.task.type}</span>
        <span class="status-chip ${overdue?'desfavoravel':'atencao'}">${overdue?'⛔':'⏰'} ${dueTxt}</span>
      </div>
      <div class="talhao-meta">${r.a.lot} · vencimento ${fmtDate(r.task.due)}</div>
    </div>`;
  }).join('') : '<div class="empty-note">Nenhuma tarefa de sanidade pendente. Rebanho em dia!</div>';

  const historicoHTML = historyRows.length ? `<div class="card">${historyRows.map(r=>`
    <div class="kv-stack"><span class="k">${fmtDate(r.h.d)} · ${r.a.brinco} — ${r.h.t}</span><span class="v">${r.h.v}</span></div>
  `).join('')}</div>` : '<div class="empty-note">Nenhum registro de sanidade ainda.</div>';

  const withdrawals = f.animals.filter(a=>animalWithdrawalActive(a));
  const withdrawHTML = withdrawals.length ? withdrawals.map(a=>`
    <div class="kv-row"><span class="k">${a.brinco}</span><span class="v">carência até ${fmtDate(animalWithdrawalActive(a))}</span></div>
  `).join('') : '<div class="kv-row"><span class="k">Nenhum animal em carência</span></div>';

  openSheet(`Sanidade do rebanho — ${f.name}`, `
    ${tabsHTML}
    ${sanidadeTab==='proximas' ? bannerHTML + proximasHTML : historicoHTML}
    <div class="h-eyebrow" style="padding:10px 0 6px;">Animais em período de carência</div>
    <div class="card">${withdrawHTML}</div>
    <p style="font-size:11px;color:var(--ink-muted);margin:8px 0 12px;">Animais em carência não devem ser vendidos ou abatidos até a data indicada.</p>
    <button class="sheet-save" onclick="closeSheet(); openMutiraoForm('${farmId}')">＋ Registrar vacinação</button>
  `);
}

// ---------------------------------------------------------------
// ALIMENTAÇÃO — estoque de ração/suplemento/mineral e registro de trato
// ---------------------------------------------------------------
function openFeedSheet(farmId){
  renderFeedBody(farmId);
}
function renderFeedBody(farmId){
  const f = farms[farmId];
  f.feed = f.feed || [];
  const rows = f.feed.map(item=>{
    const low = item.stock <= item.minStock;
    const pct = Math.min(100, Math.round(item.stock/(item.minStock*2)*100));
    return `<div class="card" style="margin-bottom:8px;">
      <div class="kv-row"><span class="k"><b>${item.name}</b> · ${item.type}</span>${low?'<span class="tag alert">Estoque baixo</span>':''}</div>
      <div class="bar-track" style="margin:6px 0;"><span class="bar-fill" style="width:${pct}%;background:${low?'var(--critical)':'var(--agro)'}"></span></div>
      <div class="kv-row"><span class="k">Estoque</span><span class="v">${item.stock} ${item.unit} (mín. ${item.minStock})</span></div>
      <div class="kv-row"><span class="k">Custo</span><span class="v">R$ ${item.costPerUnit.toFixed(2)} / ${item.unit}</span></div>
      <button class="action-btn" style="margin-top:6px;" onclick="openConsumeFeedForm('${f.id}','${item.id}')">Registrar trato (consumo)</button>
    </div>`;
  }).join('') || '<div class="empty-note">Nenhum item de alimentação cadastrado.</div>';

  openSheet(`Alimentação — ${f.name}`, `
    ${rows}
    <div class="h-eyebrow" style="padding:8px 0 4px;">Novo item</div>
    <div class="form-row2">
      <div class="form-field"><label>Nome</label><input id="nf_item_name" placeholder="Ex: Ração de cria"></div>
      <div class="form-field"><label>Tipo</label>${styledSelectHTML('nf_item_type', ['Ração','Suplemento','Mineral'].map(v=>({value:v,label:v})), 'Ração')}</div>
    </div>
    <div class="form-row2">
      <div class="form-field"><label>Estoque inicial</label><input id="nf_item_stock" type="number" placeholder="Ex: 50"></div>
      <div class="form-field"><label>Unidade</label>${styledSelectHTML('nf_item_unit', ['sacos','kg','ton'].map(v=>({value:v,label:v})), 'sacos')}</div>
    </div>
    <div class="form-row2">
      <div class="form-field"><label>Custo por unidade (R$)</label><input id="nf_item_cost" type="number" placeholder="Ex: 95"></div>
      <div class="form-field"><label>Estoque mínimo (alerta)</label><input id="nf_item_min" type="number" placeholder="Ex: 30"></div>
    </div>
    <button class="sheet-save" onclick="addFeedItem('${farmId}')">Adicionar item</button>
  `);
}
function addFeedItem(farmId){
  const name = document.getElementById('nf_item_name').value.trim();
  if(!name){ showToast('Dê um nome para o item'); return; }
  const f = farms[farmId];
  f.feed.push({id:newId('f'), name, type:document.getElementById('nf_item_type').value,
    stock:parseFloat(document.getElementById('nf_item_stock').value)||0, unit:document.getElementById('nf_item_unit').value,
    costPerUnit:parseFloat(document.getElementById('nf_item_cost').value)||0, minStock:parseFloat(document.getElementById('nf_item_min').value)||0});
  renderFeedBody(farmId);
  registerChange(`Item de alimentação "${name}" cadastrado`);
}
function openConsumeFeedForm(farmId, feedId){
  const f = farms[farmId];
  const item = f.feed.find(x=>x.id===feedId);
  const loteOptions = [{value:'',label:'— Não vincular a um lote —'}].concat((f.lotes||[]).map(l=>({value:l.id,label:l.name})));
  openSheet('Registrar trato — ' + item.name, `
    <div class="form-row2">
      <div class="form-field"><label>Lote</label>${styledSelectHTML('cf_lot', loteOptions, '')}</div>
      <div class="form-field"><label>Quantidade (${item.unit})</label><input id="cf_qty" type="number" placeholder="Ex: 5"></div>
    </div>
    <button class="sheet-save" onclick="consumeFeed('${farmId}','${feedId}')">Registrar consumo</button>
  `);
}
function consumeFeed(farmId, feedId){
  const qty = parseFloat(document.getElementById('cf_qty').value);
  if(!qty){ showToast('Informe a quantidade'); return; }
  const f = farms[farmId];
  const item = f.feed.find(x=>x.id===feedId);
  item.stock = Math.max(0, item.stock - qty);
  const loteId = document.getElementById('cf_lot').value;
  const lote = loteId ? (f.lotes||[]).find(l=>l.id===loteId) : null;
  const custo = qty * (item.costPerUnit||0);
  logCost({farmId, farmName:f.name, talhaoId:null, talhaoName:null, loteId:loteId||null, loteName:lote?lote.name:null,
    category:'Alimentação', desc:`${item.name} (${qty} ${item.unit})`, value:custo});
  renderFeedBody(farmId);
  registerChange(`Trato registrado: ${qty} ${item.unit} de ${item.name}${lote?' — '+lote.name:''}`);
}

// ---------------------------------------------------------------
// PAINEL DA PECUÁRIA — visão consolidada de todas as propriedades
// ---------------------------------------------------------------
// Resumo compacto do rebanho, embutido direto no topo da aba Pecuária de
// UMA propriedade (mesmos números do "Painel da Pecuária" completo, só que
// já filtrados pra essa fazenda, sem precisar abrir outra tela pra ver).
function pecResumoCardHTML(f){
  const pool = f.animals||[];
  if(!pool.length) return '';
  const animals = pool.filter(a=>a.statusPlantel==='Ativo'||!a.statusPlantel);
  const vacinacaoCount = pool.filter(a=>animalHealthTasks(a).some(t=>t.days!=null && t.days<=7)).length;
  const partosCount = pool.filter(a=>{
    const diag = (a.history||[]).find(h=>h.t==='Diagnóstico de gestação' && h.meta && h.meta.dueDate);
    return diag && daysFromToday(diag.meta.dueDate)!=null && daysFromToday(diag.meta.dueDate)>=0 && daysFromToday(diag.meta.dueDate)<=60;
  }).length;
  const lactantes = pool.filter(a=>a.milkStatus==='Lactante');
  const milkTotal = lactantes.reduce((s,a)=>s+(a.production||0),0);
  const trend = milkTrend7Days(f.id);
  const maxTrend = Math.max(1, ...trend.map(t=>t.total));
  const trendHTML = milkTotal>0 ? `<div style="display:flex;align-items:flex-end;gap:5px;height:76px;padding:8px 2px 0;">
    ${trend.map(t=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
      <span style="font-size:8.5px;color:var(--ink-muted);margin-bottom:3px;white-space:nowrap;">${t.total||''}</span>
      <div style="width:100%;max-width:20px;border-radius:4px 4px 0 0;background:var(--pec);height:${Math.max(3,Math.round(t.total/maxTrend*54))}px;"></div>
      <span style="font-size:8.5px;color:var(--ink-muted);margin-top:4px;white-space:nowrap;">${fmtDate(t.d).slice(0,5)}</span>
    </div>`).join('')}
  </div>` : '';
  return `<div class="card" style="margin:10px 16px 14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div class="h-eyebrow" style="margin:0;padding:0;">Resumo do rebanho</div>
      <a href="javascript:void(0)" onclick="openPecuariaPanel('${f.id}')" style="font-size:10.5px;font-weight:700;color:var(--brand-dark);text-decoration:none;">Painel completo ›</a>
    </div>
    <div class="stat-grid">
      ${statTile('cow','bg-pec', animals.length, 'Total de cabeças')}
      ${statTile('droplet','bg-sky', lactantes.length, 'Vacas leiteiras')}
      ${statTile('alarm','bg-warning', vacinacaoCount, 'Vacinação pendente')}
      ${statTile('sprout','bg-brand', partosCount, 'Partos previstos')}
    </div>
    ${milkTotal>0 ? `<div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);">
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px;"><span style="font-size:18px;font-weight:800;color:var(--brand-dark);">${milkTotal} L</span><span style="font-size:10.5px;color:var(--ink-muted);">produção de leite/dia</span></div>
      ${trendHTML}
    </div>` : ''}
  </div>`;
}
let pecPanelFilter = '';
function openPecuariaPanel(farmId){
  if(farmId!==undefined) pecPanelFilter = farmId;
  const filter = pecPanelFilter;
  const animalPool = filter ? (farms[filter].animals||[]) : allAnimalsFlat();
  const animals = animalPool.filter(a=>a.statusPlantel==='Ativo'||!a.statusPlantel);
  const cats = categoryCounts(filter||undefined);
  const vacinacaoCount = animalPool.filter(a=>animalHealthTasks(a).some(t=>t.days!=null && t.days<=7)).length;
  const partosCount = animalPool.filter(a=>{
    const diag = (a.history||[]).find(h=>h.t==='Diagnóstico de gestação' && h.meta && h.meta.dueDate);
    return diag && daysFromToday(diag.meta.dueDate)!=null && daysFromToday(diag.meta.dueDate)>=0 && daysFromToday(diag.meta.dueDate)<=60;
  }).length;
  const belowWeightCount = animalPool.filter(a=>a.targetWeight && a.weight && a.weight<a.targetWeight).length;
  const milkTotal = animalPool.filter(a=>a.milkStatus==='Lactante').reduce((s,a)=>s+(a.production||0),0);
  const mortalidade = animalPool.filter(a=>a.statusPlantel==='Morto').length;
  const nascimentos = animalPool.reduce((s,a)=>s+(a.history||[]).filter(h=>h.t==='Parto').length,0);
  const gains = animalPool.map(animalDailyGain).filter(g=>g!=null);
  const avgGain = gains.length ? (gains.reduce((s,g)=>s+g,0)/gains.length) : null;
  const upcomingActs = activities.filter(a=>a.type==='pec' && (a.bucket==='hoje'||a.bucket==='proximas') && (!filter||a.farm===filter)).length;
  const catLabels = {Vaca:'Vacas', Touro:'Touros', Bezerro:'Bezerros', Bezerra:'Bezerras', Novilha:'Novilhas', Novilho:'Novilhos', Boi:'Bois'};
  const catRows = Object.keys(cats).map(k=>`<div class="kv-row"><span class="k">${catLabels[k]||k}</span><span class="v">${cats[k]}</span></div>`).join('');
  const spCounts = speciesCounts(filter||undefined);
  const spKeys = Object.keys(spCounts);
  // Só mostra o quadro "Rebanho por espécie" quando há mais de uma espécie
  // cadastrada — quem só tem gado não precisa ver isso.
  const spRows = spKeys.map(k=>`<div class="kv-row"><span class="k">${SPECIES_LABELS[k]||k}</span><span class="v">${spCounts[k]}</span></div>`).join('');
  const farmOptions = [{value:'',label:'Todas as propriedades'}].concat(allFarmsWithPec().map(f=>({value:f.id,label:f.name})));

  const trend = milkTrend7Days(filter||undefined);
  const maxTrend = Math.max(1, ...trend.map(t=>t.total));
  const trendHTML = `<div style="display:flex;align-items:flex-end;gap:6px;height:110px;padding:6px 2px 0;">
    ${trend.map(t=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
      <span style="font-size:9px;color:var(--ink-muted);margin-bottom:3px;white-space:nowrap;">${t.total||''}</span>
      <div style="width:100%;max-width:26px;border-radius:4px 4px 0 0;background:var(--pec);height:${Math.max(3,Math.round(t.total/maxTrend*82))}px;"></div>
      <span style="font-size:9px;color:var(--ink-muted);margin-top:4px;white-space:nowrap;">${fmtDate(t.d)}</span>
    </div>`).join('')}
  </div>`;

  openSheet('Painel da Pecuária', `
    <div class="form-field" style="margin-bottom:10px;">${styledSelectHTML('pec_farm_filter', farmOptions, filter, {onChange:'openPecuariaPanel'})}</div>
    <div class="stat-grid" style="margin-bottom:10px;">
      <div class="stat-tile"><div class="stat-num">${animals.length}</div><div class="stat-lbl">Total de animais</div></div>
      <div class="stat-tile"><div class="stat-num">${vacinacaoCount}</div><div class="stat-lbl">Para vacinação (7 dias)</div></div>
      <div class="stat-tile"><div class="stat-num">${partosCount}</div><div class="stat-lbl">Partos previstos (60 dias)</div></div>
      <div class="stat-tile"><div class="stat-num">${belowWeightCount}</div><div class="stat-lbl">Animais abaixo do peso</div></div>
      <div class="stat-tile"><div class="stat-num">${milkTotal} L</div><div class="stat-lbl">Produção de leite/dia</div></div>
      <div class="stat-tile"><div class="stat-num">${mortalidade}</div><div class="stat-lbl">Mortalidade</div></div>
      <div class="stat-tile"><div class="stat-num">${nascimentos}</div><div class="stat-lbl">Nascimentos (histórico)</div></div>
      <div class="stat-tile"><div class="stat-num">${avgGain!=null?avgGain.toFixed(2)+' kg':'—'}</div><div class="stat-lbl">Ganho médio diário</div></div>
    </div>
    ${milkTotal>0 ? `<div class="h-eyebrow" style="padding:0 0 6px;">Produção de leite (7 dias)</div>
    <div class="card">${trendHTML}</div>` : ''}
    ${spKeys.length>1 ? `<div class="h-eyebrow" style="padding:10px 0 6px;">Rebanho por espécie</div>
    <div class="card">${spRows}</div>` : ''}
    <div class="h-eyebrow" style="padding:10px 0 6px;">Rebanho por categoria</div>
    <div class="card">${catRows || '<div class="kv-row"><span class="k">Sem animais cadastrados</span></div>'}</div>
    <div class="h-eyebrow" style="padding:10px 0 6px;">Atividades pecuárias próximas</div>
    <div class="card"><div class="kv-row"><span class="k">Hoje ou nos próximos dias</span><span class="v">${upcomingActs}</span></div></div>
  `);
}

function openAddAnimalForm(farmId){
  const f = farms[farmId];
  const lotOptions = f.lotes.map(l=>`<option value="${l.name}">${l.name}</option>`).join('') || '<option value="—">Sem lote cadastrado</option>';
  const pastureOptions = (f.pastures||[]).map(p=>`<option value="${p.id}">${p.name}</option>`).join('') || '<option value="">Sem pasto cadastrado</option>';
  openSheet('Novo animal', `
    <div class="filter-row" style="padding:0 0 12px;">
      <button class="chip-btn active" id="na_mode_individual" onclick="setAnimalFormMode('individual','${farmId}')">Individual</button>
      <button class="chip-btn" id="na_mode_bulk" onclick="setAnimalFormMode('bulk','${farmId}')">Cadastro em lote (vários)</button>
    </div>
    <div id="na_form_body"></div>
  `);
  setAnimalFormMode('individual', farmId);
}
function setAnimalFormMode(mode, farmId){
  document.getElementById('na_mode_individual').classList.toggle('active', mode==='individual');
  document.getElementById('na_mode_bulk').classList.toggle('active', mode==='bulk');
  const f = farms[farmId];
  const lotOptions = f.lotes.length ? f.lotes.map(l=>({value:l.name,label:l.name})) : [{value:'—',label:'Sem lote cadastrado'}];
  const pastureOptions = (f.pastures||[]).length ? (f.pastures||[]).map(p=>({value:p.id,label:p.name})) : [{value:'',label:'Sem pasto cadastrado'}];
  const speciesOptions = ANIMAL_SPECIES.map(s=>({value:s.id,label:s.label}));
  const catOptions = speciesCategoryOptions('bovino');
  const sexOptions = [{value:'Fêmea',label:'Fêmea'},{value:'Macho',label:'Macho'}];
  const purposeOptions = [{value:'Corte',label:'Corte'},{value:'Leite',label:'Leite'},{value:'Dupla aptidão',label:'Dupla aptidão'}];
  const body = document.getElementById('na_form_body');
  if(mode==='individual'){
    body.innerHTML = `
      <div class="form-row2">
        <div class="form-field"><label>Brinco</label><input id="na_brinco" placeholder="Ex: BR 0312"></div>
        <div class="form-field"><label>Identificação eletrônica (opcional)</label><input id="na_eletronic" placeholder="Ex: 982 000 123..."></div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Nome (opcional)</label><input id="na_name" placeholder="Ex: Mimosa"></div>
        <div class="form-field"><label>Raça</label><input id="na_breed" placeholder="Ex: Nelore"></div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Espécie</label>${styledSelectHTML('na_species', speciesOptions, 'bovino', {onChange:'onAnimalSpeciesChangeIndividual'})}</div>
        <div class="form-field"><label>Sexo</label>${styledSelectHTML('na_sex', sexOptions, 'Fêmea')}</div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Categoria</label>${styledSelectHTML('na_category', catOptions, catOptions[0].value)}</div>
        <div class="form-field"><label>Data de nascimento</label>${styledDateHTML('na_birth', '')}</div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Peso atual (kg)</label><input id="na_weight" type="number" placeholder="Ex: 320"></div>
        <div class="form-field"><label>Peso meta (kg, opcional)</label><input id="na_target" type="number" placeholder="Ex: 380"></div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Finalidade</label>${styledSelectHTML('na_purpose', purposeOptions, 'Corte')}</div>
        <div class="form-field"><label>Situação</label><input id="na_situation" placeholder="Ex: Em recria"></div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Pai (opcional)</label><input id="na_father" placeholder="Ex: Touro Sansão"></div>
        <div class="form-field"><label>Mãe (opcional)</label><input id="na_mother" placeholder="Ex: BR 0110"></div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Lote</label>${styledSelectHTML('na_lot', lotOptions, lotOptions[0].value)}</div>
        <div class="form-field"><label>Pasto atual</label>${styledSelectHTML('na_pasture', pastureOptions, pastureOptions[0].value)}</div>
      </div>
      <div class="form-field"><label>Situação no plantel</label>
        ${styledSelectHTML('na_statusplantel', [{value:'Ativo',label:'Ativo'},{value:'Vendido',label:'Vendido'},{value:'Morto',label:'Morto'},{value:'Descartado',label:'Descartado'}], 'Ativo')}
      </div>
      <button class="sheet-save" onclick="saveNewAnimal('${farmId}')">Salvar animal</button>`;
  } else {
    body.innerHTML = `
      <div class="form-row2">
        <div class="form-field"><label>Quantidade de animais</label><input id="nb_qty" type="number" placeholder="Ex: 10"></div>
        <div class="form-field"><label>Prefixo do brinco</label><input id="nb_prefix" placeholder="Ex: BR"></div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Raça</label><input id="nb_breed" placeholder="Ex: Nelore"></div>
        <div class="form-field"><label>Sexo</label>${styledSelectHTML('nb_sex', sexOptions, 'Fêmea')}</div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Espécie</label>${styledSelectHTML('nb_species', speciesOptions, 'bovino', {onChange:'onAnimalSpeciesChangeBulk'})}</div>
        <div class="form-field"><label>Categoria</label>${styledSelectHTML('nb_category', catOptions, catOptions[0].value)}</div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Peso médio (kg)</label><input id="nb_weight" type="number" placeholder="Ex: 200"></div>
        <div class="form-field"><label>Lote</label>${styledSelectHTML('nb_lot', lotOptions, lotOptions[0].value)}</div>
      </div>
      <div class="form-row2">
        <div class="form-field"><label>Pasto atual</label>${styledSelectHTML('nb_pasture', pastureOptions, pastureOptions[0].value)}</div>
        <div class="form-field"><label>Finalidade</label>${styledSelectHTML('nb_purpose', purposeOptions, 'Corte')}</div>
      </div>
      <button class="sheet-save" onclick="saveBulkAnimals('${farmId}')">Cadastrar todos</button>`;
  }
}
function saveNewAnimal(farmId){
  const brinco = document.getElementById('na_brinco').value.trim();
  if(!brinco){ showToast('Informe o número do brinco'); return; }
  const f = farms[farmId];
  const sex = document.getElementById('na_sex').value;
  const species = document.getElementById('na_species') ? document.getElementById('na_species').value : 'bovino';
  const weight = parseFloat(document.getElementById('na_weight').value) || null;
  const birth = document.getElementById('na_birth').value||null;
  f.animals.push({
    id:newId('a'), brinco, eletronicId:document.getElementById('na_eletronic').value.trim()||'—',
    name:document.getElementById('na_name').value.trim()||'—',
    breed:document.getElementById('na_breed').value.trim()||'—', sex,
    species,
    category:document.getElementById('na_category').value,
    birth,
    weight, targetWeight: parseFloat(document.getElementById('na_target').value)||null,
    purpose: document.getElementById('na_purpose').value,
    situation:document.getElementById('na_situation').value.trim()||'—',
    statusPlantel:document.getElementById('na_statusplantel').value,
    milkStatus: sex==='Fêmea' ? 'Seca' : '—',
    father:document.getElementById('na_father').value.trim()||'—', mother:document.getElementById('na_mother').value.trim()||'—',
    lot:document.getElementById('na_lot').value, pastureId:document.getElementById('na_pasture').value||null,
    photo: animalPhotoEmoji(species, sex),
    nextVaccine:null, production:null, weanTarget:weanTargetFromBirth(birth), weanedAt:null,
    history:[{d:isoToday(), t:'Cadastro', v:'Animal incluído no plantel', meta:{}}].concat(weight?[{d:isoToday(),t:'Pesagem',v:weight+' kg',meta:{weight}}]:[]),
  });
  closeSheet();
  renderPropertyTab();
  registerChange(`Animal ${brinco} cadastrado em ${f.name}`);
}
function saveBulkAnimals(farmId){
  const qty = parseInt(document.getElementById('nb_qty').value);
  if(!qty || qty<1){ showToast('Informe a quantidade de animais'); return; }
  const f = farms[farmId];
  const prefix = document.getElementById('nb_prefix').value.trim() || 'BR';
  const sex = document.getElementById('nb_sex').value;
  const weight = parseFloat(document.getElementById('nb_weight').value) || null;
  const lot = document.getElementById('nb_lot').value;
  const pastureId = document.getElementById('nb_pasture').value || null;
  const breed = document.getElementById('nb_breed').value.trim() || '—';
  const species = document.getElementById('nb_species') ? document.getElementById('nb_species').value : 'bovino';
  const category = document.getElementById('nb_category').value;
  const purpose = document.getElementById('nb_purpose').value;
  for(let i=0;i<qty;i++){
    idCounter++;
    f.animals.push({
      id:newId('a'), brinco:`${prefix} ${1000+idCounter}`, eletronicId:'—', name:'—', breed, sex, species, category,
      birth:null, weight, targetWeight:null, purpose, situation:'—', statusPlantel:'Ativo',
      milkStatus: sex==='Fêmea' ? 'Seca' : '—', father:'—', mother:'—',
      lot, pastureId, photo: animalPhotoEmoji(species, sex), nextVaccine:null, production:null, weanTarget:null, weanedAt:null,
      history:[{d:isoToday(), t:'Cadastro', v:'Animal incluído no plantel (cadastro em lote)', meta:{}}].concat(weight?[{d:isoToday(),t:'Pesagem',v:weight+' kg',meta:{weight}}]:[]),
    });
  }
  closeSheet();
  renderPropertyTab();
  registerChange(`${qty} animais cadastrados em lote em ${f.name}`);
}

const AGRO_ACTIVITY_SUBTYPES = ['Preparo do solo','Plantio','Adubação','Pulverização','Irrigação','Monitoramento de pragas','Aplicação de defensivos','Colheita','Manutenção de máquinas','Transporte da produção'];
function openAddActivityForm(){
  const farmOptions = Object.values(farms).map(f=>({value:f.id,label:f.name}));
  openSheet('Nova atividade', `
    <div class="form-field"><label>Título</label><input id="na2_title" placeholder="Ex: Pulverização — Talhão 4"></div>
    <div class="form-field"><label>Propriedade</label>${styledSelectHTML('na2_farm', farmOptions, farmOptions[0]?farmOptions[0].value:'')}</div>
    <div class="form-row2">
      <div class="form-field"><label>Tipo</label>${styledSelectHTML('na2_type', [{value:'agro',label:'Agricultura'},{value:'pec',label:'Pecuária'},{value:'compras',label:'Compras'},{value:'entregas',label:'Entregas'}], 'agro', {onChange:'toggleActivitySubtype'})}</div>
      <div class="form-field"><label>Quando</label>${styledSelectHTML('na2_bucket', [{value:'hoje',label:'Hoje'},{value:'proximas',label:'Próxima'},{value:'atrasadas',label:'Atrasada'}], 'hoje')}</div>
    </div>
    <div class="form-field" id="na2_subtype_wrap"><label>Subtipo (agenda agrícola)</label>
      ${styledSelectHTML('na2_subtype', [{value:'',label:'— Selecione —'}].concat(AGRO_ACTIVITY_SUBTYPES.map(s=>({value:s,label:s}))), '')}
    </div>
    <div class="form-field"><label>Data/hora (texto livre)</label><input id="na2_when" placeholder="Ex: 20 ago, 08:00"></div>
    <div class="form-field"><label>Responsável</label><input id="na2_resp" placeholder="Nome do responsável"></div>
    <button class="sheet-save" onclick="saveNewActivity()">Salvar atividade</button>
  `);
}
function toggleActivitySubtype(){
  const type = document.getElementById('na2_type').value;
  document.getElementById('na2_subtype_wrap').style.display = type==='agro' ? '' : 'none';
}
const AGRO_SUBTYPE_ICONS = {'Preparo do solo':'🚜','Plantio':'🌱','Adubação':'🧪','Pulverização':'🌫️','Irrigação':'💧','Monitoramento de pragas':'🔍','Aplicação de defensivos':'🧴','Colheita':'🌾','Manutenção de máquinas':'🔧','Transporte da produção':'🚛'};
function saveNewActivity(){
  const title = document.getElementById('na2_title').value.trim();
  if(!title){ showToast('Dê um título para a atividade'); return; }
  const farmId = document.getElementById('na2_farm').value;
  const type = document.getElementById('na2_type').value;
  const subtype = type==='agro' ? document.getElementById('na2_subtype').value : '';
  const bucket = document.getElementById('na2_bucket').value;
  const when = document.getElementById('na2_when').value.trim() || (bucket==='hoje'?'Hoje':bucket==='atrasadas'?'Atrasada':'Em breve');
  const typeIcons = {agro:'🚜', pec:'💉', compras:'🛒', entregas:'📦'};
  activities.unshift({
    id:newId('act'), farm:farmId, title, type, subtype: subtype||null,
    icon: subtype && AGRO_SUBTYPE_ICONS[subtype] ? AGRO_SUBTYPE_ICONS[subtype] : (typeIcons[type]||'📋'),
    when: bucket==='atrasadas' ? 'Atrasada — '+when : when, bucket, status:null,
    responsible: document.getElementById('na2_resp').value.trim() || '—',
  });
  closeSheet();
  renderActivitiesList(); renderHome();
  registerChange(`Atividade "${title}" criada`);
}

// Cada tipo de registro tem seus próprios campos — cobrindo Manejo
// sanitário (8.2), Reprodução (8.3), Produção (8.4) e Peso/Lotes/Custos
// do Documento Mestre completo. "fields" define os inputs extras do tipo;
// "build(vals)" monta o texto de exibição + os efeitos (meta + updates no animal).
const RA_FIELD_SPECS = {
  'Pesagem': {group:'Peso e produção', fields:[
      {id:'peso', label:'Peso (kg)', type:'number', placeholder:'Ex: 320'},
    ], build(v,a){ const w=parseFloat(v.peso); return {text:`${w} kg`, meta:{weight:w}, apply:()=>{a.weight=w;}}; }},
  'Produção': {group:'Peso e produção', fields:[
      {id:'litros', label:'Produção (litros/dia)', type:'number', placeholder:'Ex: 24'},
    ], build(v,a){ const l=parseFloat(v.litros); return {text:`${l} L/dia`, meta:{liters:l}, apply:()=>{a.production=l; a.milkStatus='Lactante';}}; }},
  'Vacina': {group:'Sanidade', fields:[
      {id:'produto', label:'Vacina aplicada', type:'text', placeholder:'Ex: Aftosa', voice:true},
      {id:'proxima', label:'Próxima dose (deixe em branco pra calcular sozinho)', type:'date'},
      {id:'carencia', label:'Carência (dias, opcional)', type:'number', placeholder:'Ex: 21'},
    ], build(v,a){
      const withdrawalUntil = v.carencia ? addDaysISO(isoToday(), parseInt(v.carencia)) : null;
      // Sem data digitada, calcula sozinho a partir do intervalo usual da
      // vacina (ver VACCINE_PROTOCOLS) — é uma estimativa pra "próxima
      // dose" nunca ficar em branco; continua dando pra digitar a data
      // certa quando o protocolo do rebanho for diferente do padrão.
      const proxima = v.proxima || nextVaccineDate(v.produto);
      const estimated = !v.proxima && !!proxima;
      return {text:`${v.produto} aplicada${proxima?' · próxima dose '+fmtDate(proxima)+(estimated?' (estimativa)':''):''}${withdrawalUntil?' · carência até '+fmtDate(withdrawalUntil):''}`,
        meta:{product:v.produto, nextDate:proxima||null, withdrawalUntil, estimated}, apply:()=>{ if(proxima) a.nextVaccine=proxima; }};
    }},
  'Vermífugo': {group:'Sanidade', fields:[
      {id:'produto', label:'Produto aplicado', type:'text', placeholder:'Ex: Ivermectina', voice:true},
      {id:'proxima', label:'Próxima aplicação (opcional)', type:'date'},
    ], build(v,a){ return {text:`${v.produto} aplicado${v.proxima?' · próxima em '+fmtDate(v.proxima):''}`, meta:{product:v.produto, nextDate:v.proxima||null}, apply:()=>{}}; }},
  'Medicamento': {group:'Sanidade', fields:[
      {id:'produto', label:'Medicamento', type:'text', placeholder:'Ex: Anti-inflamatório', voice:true},
      {id:'carencia', label:'Carência (dias, opcional)', type:'number', placeholder:'Ex: 7'},
    ], build(v,a){
      const withdrawalUntil = v.carencia ? addDaysISO(isoToday(), parseInt(v.carencia)) : null;
      return {text:`${v.produto} aplicado${withdrawalUntil?' · carência até '+fmtDate(withdrawalUntil):''}`, meta:{product:v.produto, withdrawalUntil}, apply:()=>{}};
    }},
  'Doença/Tratamento': {group:'Sanidade', fields:[
      {id:'diagnostico', label:'Diagnóstico', type:'text', placeholder:'Ex: Mastite', voice:true},
      {id:'tratamento', label:'Tratamento aplicado', type:'text', placeholder:'Ex: Antibiótico 5 dias', voice:true},
    ], build(v,a){ return {text:`${v.diagnostico} — ${v.tratamento}`, meta:{diagnostico:v.diagnostico, tratamento:v.tratamento}, apply:()=>{ a.situation = v.diagnostico; }}; }},
  'Cio': {group:'Reprodução', fields:[
      {id:'data', label:'Observado em', type:'date'},
    ], build(v,a){ return {text:`Cio observado em ${fmtDate(v.data||isoToday())}`, meta:{}, apply:()=>{}}; }},
  'Cobertura/IA': {group:'Reprodução', fields:[
      {id:'tipo', label:'Tipo', type:'select', options:['Inseminação artificial','Monta natural']},
      {id:'touro', label:'Touro ou sêmen utilizado', type:'text', placeholder:'Ex: Touro Sansão', voice:true},
    ], build(v,a){ return {text:`${v.tipo} · ${v.touro}`, meta:{tipo:v.tipo, touro:v.touro}, apply:()=>{}}; }},
  'Diagnóstico de gestação': {group:'Reprodução', fields:[
      {id:'resultado', label:'Resultado', type:'select', options:['Positivo','Negativo']},
      {id:'previsao', label:'Previsão de parto (se positivo)', type:'date'},
    ], build(v,a){
      const txt = v.resultado==='Positivo' ? `Positivo${v.previsao?' · previsão de parto '+fmtDate(v.previsao):''}` : 'Negativo';
      return {text:txt, meta:{result:v.resultado, dueDate:v.resultado==='Positivo'?(v.previsao||null):null},
        apply:()=>{ if(v.resultado==='Positivo'){ a.situation = 'Gestante'+(v.previsao?' · parto previsto em '+fmtDate(v.previsao):''); } }};
    }},
  'Parto': {group:'Reprodução', fields:[
      {id:'sexo', label:'Sexo da cria', type:'select', options:['Fêmea','Macho']},
      {id:'peso', label:'Peso ao nascer (kg, opcional)', type:'number', placeholder:'Ex: 32'},
      {id:'obs', label:'Observações (opcional)', type:'text', placeholder:'Ex: Parto sem complicações', voice:true},
    ], build(v,a){
      const w = v.peso ? parseFloat(v.peso) : null;
      const offspring = speciesOffspringInfo(a.species||'bovino');
      return {text:`${offspring.generic} ${v.sexo}${w?' · '+w+' kg ao nascer':''}${v.obs?' · '+v.obs:''}`, meta:{sexo:v.sexo, pesoNascer:w},
        apply:()=>{ a.situation='Pós-parto'; a.milkStatus = a.sex==='Fêmea'?'Lactante':a.milkStatus; }};
    }},
  'Desmama': {group:'Reprodução', fields:[
      {id:'peso', label:'Peso à desmama (kg)', type:'number', placeholder:'Ex: 180'},
    ], build(v,a){
      const w=parseFloat(v.peso);
      const previsto = a.weanTarget || null;
      const atraso = previsto ? daysFromToday(previsto) : null;
      const cmp = previsto ? (atraso<0 ? ` · ${Math.abs(atraso)} dia(s) depois do previsto (${fmtDate(previsto)})` : ` · ${atraso} dia(s) antes do previsto (${fmtDate(previsto)})`) : '';
      return {text:`Desmamado com ${w} kg${cmp}`, meta:{weight:w, previsto, efetiva:isoToday()},
        apply:()=>{ a.weight=w; a.weanedAt=isoToday(); a.weanTarget=null; }};
    }},
  'Movimentação': {group:'Lote e pasto', fields:[
      {id:'lote', label:'Novo lote', type:'text', placeholder:'Ex: Lote 5 — Engorda', voice:true},
      {id:'pasto', label:'Novo pasto', type:'text', placeholder:'Ex: Pasto Leste', voice:true},
    ], build(v,a){ const de=a.lot; return {text:`${de} → ${v.lote}${v.pasto?' · '+v.pasto:''}`, meta:{fromLot:de, toLot:v.lote, toPasture:v.pasto||null}, apply:()=>{ a.lot=v.lote; }}; }},
  'Custo': {group:'Financeiro', fields:[
      {id:'categoria', label:'Categoria', type:'select', options:['Sanidade','Alimentação','Transporte','Outro']},
      {id:'valor', label:'Valor (R$)', type:'number', placeholder:'Ex: 85'},
    ], build(v,a){ return {text:`${v.categoria} · R$ ${parseFloat(v.valor).toFixed(2)}`, meta:{categoria:v.categoria, valor:parseFloat(v.valor)}, apply:()=>{}}; }},
  'Observação': {group:'Registro de campo', fields:[
      {id:'texto', label:'Observação', type:'text', placeholder:'Ex: Animal manqueando na pata traseira', voice:true},
      {id:'foto', label:'Anexar foto (simulado)', type:'checkbox'},
      {id:'audio', label:'Anexar áudio (simulado)', type:'checkbox'},
      {id:'gps', label:'Registrar localização GPS (simulado)', type:'checkbox'},
    ], build(v,a){
      const tags = [v.foto?'📷 foto':null, v.audio?'🎙️ áudio':null, v.gps?'📍 GPS -20.55,-48.57':null].filter(Boolean);
      return {text: v.texto + (tags.length?' · '+tags.join(', '):''), meta:{}, apply:()=>{}};
    }},
  'Manejo': {group:'Registro de campo', fields:[
      {id:'desc', label:'Descrição do manejo', type:'text', placeholder:'Ex: Casqueamento', voice:true},
    ], build(v,a){ return {text:v.desc, meta:{}, apply:()=>{}}; }},
};
function addDaysISO(iso, days){
  const dt = parseISO(iso); dt.setDate(dt.getDate()+days);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
// Intervalo padrão (em dias) até a próxima dose, por tipo de vacina —
// usado só pra calcular sozinho a "próxima dose" quando ninguém digita
// uma data específica. São intervalos usuais no manejo brasileiro, mas
// cada rebanho/veterinário pode seguir um protocolo diferente — por isso
// o campo "Próxima dose" continua editável à mão; isso aqui é só o padrão
// de estimativa, não substitui orientação veterinária.
const VACCINE_PROTOCOLS = [
  {match:/aftosa/i, days:120},
  {match:/brucelose/i, days:null}, // dose única (fêmeas 3–8 meses), sem revacinação de rotina
  {match:/raiva/i, days:365},
  {match:/clostrid|manqueira|polivalente/i, days:180},
  {match:/ibr|bvd|viral/i, days:180},
  {match:/leptospir/i, days:180},
  {match:/carbunc/i, days:365},
];
function nextVaccineDate(produto){
  const p = (produto||'').trim();
  if(!p) return null;
  const hit = VACCINE_PROTOCOLS.find(v=>v.match.test(p));
  const days = hit ? hit.days : 180; // padrão genérico quando o nome não é reconhecido
  return days ? addDaysISO(isoToday(), days) : null;
}
// Idade alvo usual de desmama de bezerros (~7 meses) — só uma estimativa
// pra "data prevista de desmama" a partir do nascimento; o registro de
// Desmama sempre aceita o peso e a data reais na hora que acontecer.
const WEAN_TARGET_DAYS = 210;
function weanTargetFromBirth(birthISO){ return birthISO ? addDaysISO(birthISO, WEAN_TARGET_DAYS) : null; }
// Idade em texto curto ("3 meses"/"2 anos") a partir da data de
// nascimento — usada na ficha do animal.
function ageLabel(birthISO){
  if(!birthISO) return null;
  const days = daysBetween(birthISO, isoToday());
  if(days<0) return null;
  if(days<60) return `${days} dia${days===1?'':'s'}`;
  const months = Math.floor(days/30.44);
  if(months<24) return `${months} ${months===1?'mês':'meses'}`;
  const years = Math.floor(months/12);
  return `${years} ano${years===1?'':'s'}`;
}
// Gera um brinco pro bezerro a partir do brinco da mãe (ex: "BR 0312-B1"),
// contando quantos filhotes essa mãe já tem registrados no plantel.
function nextCalfBrinco(farm, motherBrinco){
  const n = farm.animals.filter(x=>x.mother===motherBrinco).length + 1;
  return `${motherBrinco}-B${n}`;
}
function openRegisterAnimalActivity(farmId, animalId){
  const groups = {};
  Object.keys(RA_FIELD_SPECS).forEach(k=>{ (groups[RA_FIELD_SPECS[k].group] = groups[RA_FIELD_SPECS[k].group]||[]).push(k); });
  const raGroups = Object.keys(groups).map(g=>({label:g, options:groups[g].map(k=>({value:k,label:k}))}));
  openSheet('Registrar atividade do animal', `
    <div class="form-field"><label>Tipo</label>
      ${styledSelectGroupedHTML('ra_type', raGroups, 'Pesagem', {onChange:'renderRAField'})}
    </div>
    <div id="ra_field_container"></div>
    <button class="sheet-save" onclick="saveAnimalActivity('${farmId}','${animalId}')">Registrar</button>
  `);
  renderRAField('Pesagem');
}
function renderRAField(type){
  const spec = RA_FIELD_SPECS[type];
  const box = document.getElementById('ra_field_container');
  box.innerHTML = spec.fields.map(f=>{
    if(f.type==='select'){
      return `<div class="form-field"><label>${f.label}</label>${styledSelectHTML('raf_'+f.id, f.options.map(o=>({value:o,label:o})), f.options[0])}</div>`;
    }
    if(f.type==='checkbox'){
      return `<div class="toggle-row"><span class="tlabel">${f.label}</span><input type="checkbox" id="raf_${f.id}" style="width:18px;height:18px;"></div>`;
    }
    return `<div class="form-field"><label>${f.label}</label><input id="raf_${f.id}" type="${f.type}" placeholder="${f.placeholder||''}">${f.voice?`<button type="button" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:6px;padding:7px;" onclick="startVoiceDictation('raf_${f.id}', this)">🎙️ Ditar por voz</button>`:''}</div>`;
  }).join('');
}
// ---------------------------------------------------------------
// DITADO POR VOZ — no app instalado (Android/iOS) usa o plugin nativo
// @capacitor-community/speech-recognition (reconhecedor de voz do
// próprio aparelho, funciona até sem Chrome). Na prévia web (navegador
// de desktop), continua usando a Web Speech API do Chrome como antes.
// ---------------------------------------------------------------
function startVoiceDictation(targetId, btnEl){
  const target = document.getElementById(targetId);
  if(!target || (btnEl && btnEl.dataset.listening==='1')) return;

  const NativeSR = IS_NATIVE_APP && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition;
  if(NativeSR){ startVoiceDictationNative(target, btnEl, NativeSR); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ showToast('Ditado por voz não é compatível com este navegador. No celular, tente pelo Chrome.'); return; }
  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  const prevLabel = btnEl ? btnEl.innerHTML : null;
  if(btnEl){ btnEl.dataset.listening='1'; btnEl.innerHTML = '🎙️ Ouvindo… fale agora'; }
  rec.onresult = (e)=>{
    const text = e.results[0][0].transcript;
    const sep = target.value && !/[\s\n]$/.test(target.value) ? ' ' : '';
    target.value = (target.value||'') + sep + text;
  };
  rec.onerror = (e)=>{
    if(e.error==='no-speech') showToast('Não entendi — toque no botão e tente de novo.');
    else if(e.error==='not-allowed' || e.error==='service-not-allowed') showToast('Permissão de microfone negada. Ative o microfone para o site e tente de novo.');
    else showToast('Não foi possível captar o áudio agora.');
  };
  rec.onend = ()=>{
    if(btnEl){ delete btnEl.dataset.listening; btnEl.innerHTML = prevLabel; }
  };
  try{ rec.start(); }catch(e){ if(btnEl){ delete btnEl.dataset.listening; btnEl.innerHTML = prevLabel; } }
}
// Caminho nativo: pede permissão de microfone (o plugin já registra
// RECORD_AUDIO no Android sozinho, não precisa tocar no Manifest) e
// escuta uma frase, devolvendo o texto direto — sem eventos soltos.
async function startVoiceDictationNative(target, btnEl, SR){
  const prevLabel = btnEl ? btnEl.innerHTML : null;
  try{
    const avail = await SR.available();
    if(!avail || !avail.available){ showToast('Reconhecimento de voz não está disponível neste aparelho.'); return; }
    let perm = await SR.checkPermissions();
    if(perm.speechRecognition !== 'granted') perm = await SR.requestPermissions();
    if(perm.speechRecognition !== 'granted'){ showToast('Permissão de microfone negada. Ative o microfone para o app nas configurações do celular.'); return; }
    if(btnEl){ btnEl.dataset.listening='1'; btnEl.innerHTML = '🎙️ Ouvindo… fale agora'; }
    const result = await SR.start({ language:'pt-BR', maxResults:1, partialResults:false, popup:false });
    const text = result && result.matches && result.matches[0];
    if(text){
      const sep = target.value && !/[\s\n]$/.test(target.value) ? ' ' : '';
      target.value = (target.value||'') + sep + text;
    }else{
      showToast('Não entendi — toque no botão e tente de novo.');
    }
  }catch(e){
    showToast('Não foi possível captar o áudio agora.');
  }finally{
    if(btnEl){ delete btnEl.dataset.listening; btnEl.innerHTML = prevLabel; }
  }
}

// ---------------------------------------------------------------
// CHECKLIST DE ROTINA DIÁRIA — lista curta de verificações do dia a dia
// (água, cerca, sinais de doença etc.), por propriedade. "Diária" aqui
// significa: se o dia mudou desde a última vez que essa propriedade foi
// aberta, a lista reaparece toda desmarcada — sem precisar guardar uma
// lista nova por data (o histórico de "cumprido ou não" não é o ponto;
// o ponto é lembrar do que fazer HOJE). Os itens (e os que a pessoa
// adicionar) persistem de um dia pro outro, só o "feito" reseta.
// ---------------------------------------------------------------
const DEFAULT_DAILY_CHECKLIST = [
  'Conferir água e bebedouros',
  'Verificar cercas e porteiras',
  'Observar sinais de doença nos animais',
  'Checar previsão do tempo do dia',
  'Revisar atividades agendadas para hoje',
];
function ensureDailyChecklist(f){
  const today = isoToday();
  if(!f.dailyChecklist){
    f.dailyChecklist = { date: today, items: DEFAULT_DAILY_CHECKLIST.map((text,i)=>({id:'dc'+i, text, done:false})) };
  } else if(f.dailyChecklist.date !== today){
    f.dailyChecklist = { date: today, items: f.dailyChecklist.items.map(it=>({...it, done:false})) };
  }
  return f.dailyChecklist;
}
function dailyChecklistCardHTML(f){
  const cl = ensureDailyChecklist(f);
  const doneCount = cl.items.filter(it=>it.done).length;
  const allDone = doneCount===cl.items.length && cl.items.length>0;
  return `<div class="link-card" onclick="openDailyChecklist('${f.id}')">
    <div class="lc-ic ${allDone?'bg-brand':'bg-sky'}">${svgIcon(allDone?'check-circle':'clipboard',{size:19})}</div>
    <div class="lc-body">
      <div class="lc-title">Checklist do dia</div>
      <div class="lc-sub">Toque para ver e marcar os itens de hoje</div>
    </div>
    <div class="lc-side">
      <span class="lc-badge ${allDone?'':'pending'}">${doneCount}/${cl.items.length}</span>
      ${svgIcon('chevron-right',{size:16,style:'color:var(--ink-muted);'})}
    </div>
  </div>`;
}
function openDailyChecklist(farmId){
  renderDailyChecklistBody(farmId);
}
function renderDailyChecklistBody(farmId){
  const f = farms[farmId];
  const cl = ensureDailyChecklist(f);
  const doneCount = cl.items.filter(it=>it.done).length;
  const allDone = doneCount===cl.items.length && cl.items.length>0;
  openSheet(`Checklist do dia — ${f.name}`, `
    <div class="link-card" style="cursor:default;margin:0 0 12px;">
      <div class="lc-ic ${allDone?'bg-brand':'bg-sky'}">${svgIcon(allDone?'check-circle':'clipboard',{size:19})}</div>
      <div class="lc-body">
        <div class="lc-title">${allDone?'Tudo em dia por hoje':'Progresso de hoje'}</div>
        <div class="lc-sub">${fmtDate(cl.date)}</div>
      </div>
      <span class="lc-badge ${allDone?'':'pending'}">${doneCount}/${cl.items.length}</span>
    </div>
    <div class="card" style="padding:4px 14px;">${cl.items.map(it=>`
      <div class="chk-item ${it.done?'checked':''}" onclick="toggleDailyChecklistItem('${farmId}','${it.id}')">
        <div class="chk-box">${it.done?svgIcon('check',{size:14}):''}</div>
        <span class="chk-label">${it.text}</span>
      </div>`).join('')}</div>
    <div class="form-field" style="margin-top:12px;"><label>Adicionar item</label>
      <div style="display:flex;gap:6px;">
        <input id="dc_new" placeholder="Ex: Trocar sal mineral do cocho" style="flex:1;">
        <button type="button" class="icon-btn-sm" style="width:auto;padding:0 12px;" onclick="addDailyChecklistItem('${farmId}')">＋</button>
      </div>
    </div>
  `);
}
function toggleDailyChecklistItem(farmId, itemId){
  const f = farms[farmId];
  const cl = ensureDailyChecklist(f);
  const it = cl.items.find(x=>x.id===itemId);
  if(it) it.done = !it.done;
  renderDailyChecklistBody(farmId);
  if(document.getElementById('screen-property').classList.contains('active')) renderPropertyTab();
}
function addDailyChecklistItem(farmId){
  const val = document.getElementById('dc_new').value.trim();
  if(!val) return;
  const f = farms[farmId];
  const cl = ensureDailyChecklist(f);
  cl.items.push({id:newId('dc'), text:val, done:false});
  renderDailyChecklistBody(farmId);
}

// ---------------------------------------------------------------
// RESUMO DO DIA — junta, de todas as propriedades, o que aconteceu e o que
// ainda falta hoje (atividades, alertas de talhão, checklist, custo do
// dia) num texto curto — pronto pra ler rápido ou mandar pro grupo da
// fazenda no WhatsApp, sem precisar abrir o app inteiro pra montar isso
// na mão. Reaproveita o mesmo padrão de compartilhamento de Relatórios
// (wa.me).
// ---------------------------------------------------------------
function buildDailySummaryLines(){
  const allFarms = Object.values(farms);
  const hoje = activities.filter(a=>a.bucket==='hoje');
  const atrasadas = activities.filter(a=>a.bucket==='atrasadas');
  const concluidasHoje = activities.filter(a=>a.bucket==='concluidas' && /hoje/i.test(a.when||''));
  const talhoesAtencao = allFarms.reduce((s,f)=>s+(f.talhoes||[]).filter(t=>t.status==='atencao'||t.status==='desfavoravel').length,0);
  const custoHoje = costLedger.filter(c=>c.d===isoToday()).reduce((s,c)=>s+(c.value||0),0);
  const checklistLines = allFarms.map(f=>{
    const cl = ensureDailyChecklist(f);
    const done = cl.items.filter(it=>it.done).length;
    return `${f.name}: checklist ${done}/${cl.items.length}`;
  });
  const lines = [];
  lines.push(`🌱 Resumo do dia — ${fmtDate(isoToday())}`);
  lines.push('');
  lines.push(`📌 Atividades: ${hoje.length} para hoje, ${atrasadas.length} atrasada(s), ${concluidasHoje.length} concluída(s) hoje.`);
  if(atrasadas.length) lines.push(...atrasadas.slice(0,5).map(a=>`  ⚠ ${a.title} (${farms[a.farm]?farms[a.farm].name:a.farm})`));
  if(hoje.length) lines.push(...hoje.slice(0,5).map(a=>`  • ${a.title} (${farms[a.farm]?farms[a.farm].name:a.farm})`));
  lines.push('');
  lines.push(`🚜 Talhões em atenção/desfavorável: ${talhoesAtencao}`);
  lines.push(`✅ ${checklistLines.join(' · ')}`);
  if(custoHoje>0) lines.push(`💰 Custo lançado hoje: R$ ${custoHoje.toFixed(2)}`);
  return lines;
}
// Versão estruturada do resumo do dia (mesmos dados de buildDailySummaryLines,
// só que como itens {level, icon, text, sub} pra renderizar em linhas com
// ícone colorido — urgente/atenção/info — em vez de um bloco de texto só.
function buildDailySummaryItems(){
  const allFarms = Object.values(farms);
  const hoje = activities.filter(a=>a.bucket==='hoje');
  const atrasadas = activities.filter(a=>a.bucket==='atrasadas');
  const concluidasHoje = activities.filter(a=>a.bucket==='concluidas' && /hoje/i.test(a.when||''));
  const talhoesAtencao = allFarms.reduce((s,f)=>s+(f.talhoes||[]).filter(t=>t.status==='atencao'||t.status==='desfavoravel').length,0);
  const custoHoje = costLedger.filter(c=>c.d===isoToday()).reduce((s,c)=>s+(c.value||0),0);
  const items = [];
  atrasadas.forEach(a=>items.push({level:'urgente', icon:'warning', text:`${a.title} — atrasada`, sub:farms[a.farm]?farms[a.farm].name:a.farm}));
  if(talhoesAtencao>0) items.push({level:'urgente', icon:'warning', text:`${talhoesAtencao} talhão(ões) em atenção/desfavorável`, sub:'Agricultura'});
  hoje.forEach(a=>items.push({level:'atencao', icon:'alarm', text:a.title, sub:farms[a.farm]?farms[a.farm].name:a.farm}));
  allFarms.forEach(f=>{
    const cl = ensureDailyChecklist(f);
    const done = cl.items.filter(it=>it.done).length;
    if(cl.items.length && done<cl.items.length) items.push({level:'atencao', icon:'clipboard', text:`Checklist do dia: ${done}/${cl.items.length}`, sub:f.name});
  });
  if(concluidasHoje.length) items.push({level:'info', icon:'check-circle', text:`${concluidasHoje.length} atividade(s) concluída(s) hoje`, sub:''});
  if(custoHoje>0) items.push({level:'info', icon:'check-circle', text:`Custo lançado hoje: R$ ${custoHoje.toFixed(2)}`, sub:''});
  if(!items.length) items.push({level:'info', icon:'check-circle', text:'Tudo em dia — nenhuma pendência para hoje.', sub:''});
  return items;
}
const SUMMARY_LEVEL_CLASS = {urgente:'pri-alta', atencao:'pri-media', info:'pri-baixa'};
let summaryFilter = 'todas';
function setSummaryFilter(f){ summaryFilter = f; renderDailySummaryBody(); }
function openDailySummary(){
  summaryFilter = 'todas';
  renderDailySummaryBody();
}
function renderDailySummaryBody(){
  const items = buildDailySummaryItems();
  const counts = {urgente:0, atencao:0, info:0};
  items.forEach(it=>counts[it.level]++);
  const filtered = summaryFilter==='todas' ? items : items.filter(it=>it.level===summaryFilter);
  const FILTERS = [
    {id:'todas', label:'Todas'},
    {id:'urgente', label:`Urgente (${counts.urgente})`},
    {id:'atencao', label:`Atenção (${counts.atencao})`},
    {id:'info', label:`Info (${counts.info})`},
  ];
  const tabsHTML = `<div class="filter-row" style="padding:0 0 10px;">${FILTERS.map(f=>
    `<button class="chip-btn ${summaryFilter===f.id?'active':''}" onclick="setSummaryFilter('${f.id}')">${f.label}</button>`).join('')}</div>`;
  const rowsHTML = filtered.map(it=>{
    const cls = SUMMARY_LEVEL_CLASS[it.level];
    return `<div class="notif-item ${cls}" style="cursor:default;">
      <div class="notif-ic ${cls}">${svgIcon(it.icon,{size:16})}</div>
      <div style="flex:1;min-width:0;">
        <div class="notif-title">${it.text}</div>
        ${it.sub?`<div class="notif-farmline">${it.sub}</div>`:''}
      </div>
    </div>`;
  }).join('') || '<div class="empty-note">Nada nessa categoria por hoje.</div>';
  openSheet(`Resumo do dia — ${fmtDate(isoToday())}`, `
    ${tabsHTML}
    ${rowsHTML}
    <button class="sheet-save" onclick="shareDailySummaryWhatsApp()">💬 Compartilhar no WhatsApp</button>
  `);
}
function shareDailySummaryWhatsApp(){
  const text = buildDailySummaryLines().join('\n');
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  registerChange('Resumo do dia compartilhado via WhatsApp');
}

// ---------------------------------------------------------------
// QR DO ANIMAL — gera uma etiqueta (pra colar no brinco/cocho) que pode
// ser impressa direto do computador. A leitura por câmera é só no app do
// celular (não faz sentido num site). A biblioteca (qrcode) fica guardada
// dentro do próprio site (carregada por <script> no index.html) —
// não vem de um CDN externo (era assim antes e podia falhar mesmo com
// internet normal, se a rede da pessoa não alcançasse aquele CDN
// específico) — então funciona sempre, com ou sem internet.
// ---------------------------------------------------------------
function ensureQRCodeLib(){
  return Promise.resolve(typeof QRCode !== 'undefined');
}
function openAnimalQR(farmId, animalId){
  const f = farms[farmId];
  const a = f && f.animals.find(x=>x.id===animalId);
  if(!a) return;
  openSheet('QR do animal', `
    <div style="text-align:center;">
      <div class="talhao-name" style="margin-bottom:2px;">${a.brinco}${a.name && a.name!=='—' ? ' · '+a.name : ''}</div>
      <div class="talhao-meta" style="margin-bottom:14px;">${f.name}</div>
      <div id="animalQRWrap" style="display:flex;justify-content:center;"><div class="empty-note">Gerando QR…</div></div>
      <div class="empty-note" style="margin-top:14px;text-align:left;">Cole essa etiqueta no brinco, cocho ou ficha do animal. No app do celular, "Pecuária → Escanear QR" abre a ficha dele direto.</div>
    </div>
  `);
  ensureQRCodeLib().then(ok=>{
    const wrap = document.getElementById('animalQRWrap');
    if(!wrap) return; // sheet foi fechado enquanto a biblioteca carregava
    if(!ok){
      wrap.innerHTML = '<div class="empty-note">Não foi possível carregar o gerador de QR agora — confira sua internet e toque em "Gerar QR" de novo.</div>';
      return;
    }
    const payload = JSON.stringify({app:'agroop', farmId, animalId});
    const canvas = document.createElement('canvas');
    wrap.innerHTML = '';
    wrap.appendChild(canvas);
    QRCode.toCanvas(canvas, payload, {width:200, margin:1}, (err)=>{
      if(err) wrap.innerHTML = '<div class="empty-note">Não foi possível gerar o QR agora.</div>';
    });
  });
}
// Núcleo compartilhado: aplica UM tipo de atividade (do RA_FIELD_SPECS) a UM
// animal — grava no histórico, roda spec.build()/apply() e os efeitos
// colaterais (alerta de queda de leite/peso, custo, ficha automática do
// bezerro no Parto). Extraído de saveAnimalActivity para ser reaproveitado
// pelo Modo mutirão (saveMutirao), que faz a mesma coisa pra vários animais
// de uma vez, sem duplicar essa lógica.
function applyAnimalActivityToAnimal(farmId, animalId, type, vals){
  const spec = RA_FIELD_SPECS[type];
  const a = farms[farmId].animals.find(x=>x.id===animalId);
  if(!a || !spec) return null;
  const prevProductions = animalMilkEntries(a);
  const prevWeighings = animalWeighings(a);
  const result = spec.build(vals, a);
  a.history.unshift({d:isoToday(), t:type, v:result.text, meta:result.meta});
  result.apply();
  if(type==='Custo' && result.meta.valor){
    logCost({farmId, farmName:farms[farmId].name, talhaoId:null, talhaoName:null, loteId:null, loteName:a.lot||null,
      animalId:a.id, animalName:a.brinco, category:result.meta.categoria||'Sanidade', desc:`${a.brinco} — ${result.meta.categoria}`, value:result.meta.valor});
  }
  if(type==='Produção' && result.meta.liters!=null && prevProductions.length){
    const last = prevProductions[prevProductions.length-1].meta.liters;
    if(last>0 && result.meta.liters < last*0.8){
      const pct = Math.round((1 - result.meta.liters/last)*100);
      notifications.unshift({id:newId('n'), farm:farmId, icon:'📉', title:`Queda na produção de leite — ${a.brinco}`,
        body:`${a.brinco} produziu ${result.meta.liters} L hoje, uma queda de ${pct}% em relação aos ${last} L da última medição. Vale investigar saúde, nutrição ou manejo.`,
        time:'agora', category:'Pecuária', priority:'Média', target:{screen:'animal', farm:farmId, animal:a.id}});
      renderNotifications();
    }
  }
  // Peso parado ou caindo (recria/engorda) — mesma ideia do alerta de
  // queda de leite acima, só que comparando com a pesagem anterior.
  if(type==='Pesagem' && result.meta.weight!=null && prevWeighings.length){
    const prev = prevWeighings[prevWeighings.length-1].meta.weight;
    const atual = result.meta.weight;
    if(prev>0 && atual <= prev){
      const perdeu = atual < prev;
      notifications.unshift({id:newId('n'), farm:farmId, icon: perdeu?'📉':'⚠️',
        title:`${perdeu?'Perda':'Peso parado'} de peso — ${a.brinco}`,
        body:`${a.brinco} ${perdeu?`perdeu peso: foi de ${prev} kg pra ${atual} kg`:`ficou com o mesmo peso da última pesagem (${atual} kg)`} desde a última medição. Vale conferir alimentação, água e saúde.`,
        time:'agora', category:'Pecuária', priority:'Média', target:{screen:'animal', farm:farmId, animal:a.id}});
      renderNotifications();
    }
  }
  // Parto: além de registrar no histórico da mãe, cadastra o bezerro
  // automaticamente como um animal novo (em vez de exigir que a pessoa
  // preencha a ficha dele do zero logo em seguida).
  if(type==='Parto'){
    const farm = farms[farmId];
    const calfBrinco = nextCalfBrinco(farm, a.brinco);
    const species = a.species || 'bovino';
    const offspring = speciesOffspringInfo(species);
    const calf = {
      id:newId('a'), brinco:calfBrinco, eletronicId:'—', name:'—',
      breed:a.breed, sex:result.meta.sexo, species,
      category: result.meta.sexo==='Fêmea' ? offspring.Fêmea : offspring.Macho,
      birth:isoToday(), weight:result.meta.pesoNascer||null, targetWeight:null,
      situation:'Recém-nascido', statusPlantel:'Ativo',
      milkStatus: result.meta.sexo==='Fêmea' ? 'Seca' : '—',
      father:a.father||'—', mother:a.brinco, lot:a.lot, pastureId:a.pastureId,
      photo: animalPhotoEmoji(species, result.meta.sexo), purpose:a.purpose||'Corte',
      nextVaccine:null, production:null, weanTarget:weanTargetFromBirth(isoToday()), weanedAt:null,
      history:[{d:isoToday(), t:'Nascimento', v:`Nascido(a) de ${a.brinco}${result.meta.pesoNascer?' · '+result.meta.pesoNascer+' kg ao nascer':''}`, meta:{mae:a.brinco}}],
    };
    farm.animals.push(calf);
    showToast(`${offspring.generic} ${calfBrinco} cadastrado(a) automaticamente`);
  }
  return result;
}
function saveAnimalActivity(farmId, animalId){
  const type = document.getElementById('ra_type').value;
  const spec = RA_FIELD_SPECS[type];
  const a = farms[farmId].animals.find(x=>x.id===animalId);
  const vals = {};
  for(const f of spec.fields){
    const el = document.getElementById('raf_'+f.id);
    vals[f.id] = f.type==='checkbox' ? el.checked : el.value.trim();
  }
  const requiredMissing = spec.fields.find(f=>f.type!=='checkbox' && f.type!=='date' && !String(vals[f.id]||'').trim() && f.id!=='previsao' && f.id!=='proxima' && f.id!=='carencia' && f.id!=='obs');
  if(requiredMissing){ showToast('Preencha ' + requiredMissing.label.toLowerCase()); return; }
  applyAnimalActivityToAnimal(farmId, animalId, type, vals);
  closeSheet();
  renderAnimalTabs();
  registerChange(`${type} registrada para ${a.brinco}`);
}

// ---------------------------------------------------------------
// MODO MUTIRÃO — registrar a mesma vacina/vermífugo/medicamento (ou uma
// pesagem, cada um com seu peso) pra vários animais de uma vez, em vez de
// abrir "Registrar atividade" um por um — o jeito que o manejo realmente
// acontece no curral. Reaproveita RA_FIELD_SPECS e applyAnimalActivityToAnimal,
// então herda os mesmos alertas (peso parado/caindo etc.) automaticamente.
// ---------------------------------------------------------------
const MUTIRAO_TYPES = ['Vacina','Vermífugo','Medicamento','Pesagem'];
function openMutiraoForm(farmId){
  const f = farms[farmId];
  if(!f || !(f.animals||[]).length){ showToast('Cadastre animais nesta propriedade antes de usar o modo mutirão.'); return; }
  window._mutiraoFarm = farmId;
  openSheet('Modo mutirão', `
    <div class="form-field"><label>O que vai registrar</label>
      ${styledSelectHTML('mut_type', MUTIRAO_TYPES.map(t=>({value:t,label:t})), MUTIRAO_TYPES[0], {onChange:'renderMutiraoFields'})}
    </div>
    <div id="mut_shared_fields"></div>
    <div class="h-eyebrow" style="padding:8px 0 4px;display:flex;align-items:center;justify-content:space-between;">
      <span>Animais (${f.animals.length})</span>
      <a href="javascript:void(0)" onclick="toggleMutiraoAll()" style="font-size:11px;font-weight:700;color:var(--brand-dark);text-decoration:none;">Selecionar todos</a>
    </div>
    <div id="mut_animal_list" class="card" style="max-height:280px;overflow:auto;"></div>
    <button class="sheet-save" onclick="saveMutirao()">Registrar para os selecionados</button>
  `);
  renderMutiraoFields();
}
function renderMutiraoFields(){
  const type = document.getElementById('mut_type').value;
  const spec = RA_FIELD_SPECS[type];
  const isPesagem = type==='Pesagem';
  // Na Pesagem, o peso é o próprio motivo de existir o mutirão — cada
  // animal tem o seu, então esse campo vira uma coluna na lista de animais
  // (renderMutiraoAnimalList) em vez de um valor único pra todo mundo.
  const sharedFields = spec.fields.filter(fld=>!(isPesagem && fld.id==='peso'));
  document.getElementById('mut_shared_fields').innerHTML = sharedFields.map(fld=>{
    if(fld.type==='select'){
      return `<div class="form-field"><label>${fld.label}</label>${styledSelectHTML('mutf_'+fld.id, fld.options.map(o=>({value:o,label:o})), fld.options[0])}</div>`;
    }
    if(fld.type==='checkbox'){
      return `<div class="toggle-row"><span class="tlabel">${fld.label}</span><input type="checkbox" id="mutf_${fld.id}" style="width:18px;height:18px;"></div>`;
    }
    return `<div class="form-field"><label>${fld.label}</label><input id="mutf_${fld.id}" type="${fld.type}" placeholder="${fld.placeholder||''}"></div>`;
  }).join('');
  renderMutiraoAnimalList();
}
function renderMutiraoAnimalList(){
  const type = document.getElementById('mut_type').value;
  const isPesagem = type==='Pesagem';
  const f = farms[window._mutiraoFarm];
  document.getElementById('mut_animal_list').innerHTML = f.animals.map(a=>`
    <div class="kv-row" style="align-items:center;">
      <span class="k" style="display:flex;align-items:center;gap:8px;flex:1;font-weight:600;">
        <input type="checkbox" class="mut-animal-chk" data-id="${a.id}" style="width:17px;height:17px;flex:none;">
        <span>${a.brinco} <span style="color:var(--ink-muted);font-weight:400;">· ${a.category||a.sex} · ${a.lot}</span></span>
      </span>
      ${isPesagem ? `<input type="number" inputmode="decimal" class="mut-animal-peso" data-id="${a.id}" placeholder="kg" style="width:64px;padding:5px 7px;border-radius:8px;border:1px solid var(--border);">` : ''}
    </div>`).join('');
}
function toggleMutiraoAll(){
  const boxes = document.querySelectorAll('.mut-animal-chk');
  const allChecked = Array.from(boxes).every(b=>b.checked);
  boxes.forEach(b=>{ b.checked = !allChecked; });
}
function saveMutirao(){
  const type = document.getElementById('mut_type').value;
  const spec = RA_FIELD_SPECS[type];
  const farmId = window._mutiraoFarm;
  const isPesagem = type==='Pesagem';
  const sharedFields = spec.fields.filter(fld=>!(isPesagem && fld.id==='peso'));
  const sharedVals = {};
  for(const fld of sharedFields){
    const el = document.getElementById('mutf_'+fld.id);
    sharedVals[fld.id] = fld.type==='checkbox' ? el.checked : el.value.trim();
  }
  const requiredMissing = sharedFields.find(fld=>fld.type!=='checkbox' && fld.type!=='date' && !String(sharedVals[fld.id]||'').trim() && fld.id!=='previsao' && fld.id!=='proxima' && fld.id!=='carencia' && fld.id!=='obs');
  if(requiredMissing){ showToast('Preencha ' + requiredMissing.label.toLowerCase()); return; }
  const checked = Array.from(document.querySelectorAll('.mut-animal-chk')).filter(b=>b.checked);
  if(!checked.length){ showToast('Selecione pelo menos um animal.'); return; }
  let count = 0, skipped = 0;
  checked.forEach(box=>{
    const animalId = box.dataset.id;
    const vals = Object.assign({}, sharedVals);
    if(isPesagem){
      const pesoEl = document.querySelector(`.mut-animal-peso[data-id="${animalId}"]`);
      const peso = pesoEl ? pesoEl.value.trim() : '';
      if(!peso){ skipped++; return; }
      vals.peso = peso;
    }
    applyAnimalActivityToAnimal(farmId, animalId, type, vals);
    count++;
  });
  closeSheet();
  if(document.getElementById('screen-property').classList.contains('active')) renderPropertyTab();
  showToast(`${type} registrada para ${count} animal(is)${skipped?` · ${skipped} sem peso, pulado(s)`:''}.`);
  if(count) registerChange(`Mutirão de ${type.toLowerCase()} para ${count} animal(is)`);
}

function openReagendarTalhao(farmId, talhaoId){
  openSheet('Reagendar atividade', `
    <div class="form-field"><label>Nova data/hora</label><input id="rt_when" placeholder="Ex: 18 ago, 09:00"></div>
    <button class="sheet-save" onclick="saveReagendarTalhao('${farmId}','${talhaoId}')">Confirmar reagendamento</button>
  `);
}
function saveReagendarTalhao(farmId, talhaoId){
  const when = document.getElementById('rt_when').value.trim();
  if(!when){ showToast('Informe a nova data'); return; }
  const t = farms[farmId].talhoes.find(x=>x.id===talhaoId);
  const oldActivity = t.activity;
  t.activity = t.activity.split(' — ')[0] + ' — ' + when;
  closeSheet();
  openCondition(farmId, talhaoId);
  registerChange(`Atividade reagendada: ${oldActivity} → ${when}`);
}
function openEditTalhao(farmId, talhaoId){
  const t = farms[farmId].talhoes.find(x=>x.id===talhaoId);
  openSheet('Editar talhão', `
    <div class="form-field"><label>Estágio</label><input id="et_stage" value="${t.stage}"></div>
    <div class="form-field"><label>Classificação</label>
      ${styledSelectHTML('et_status', [
        {value:'favoravel',label:'Favorável'},
        {value:'atencao',label:'Atenção'},
        {value:'desfavoravel',label:'Desfavorável'},
        {value:'dados',label:'Dados insuficientes'},
      ], t.status)}
    </div>
    <div class="form-field"><label>Motivo</label>
      <textarea id="et_reason">${t.reason}</textarea>
      <button type="button" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:6px;padding:7px;" onclick="startVoiceDictation('et_reason', this)">🎙️ Ditar por voz</button>
    </div>
    <button class="sheet-save" onclick="saveEditTalhao('${farmId}','${talhaoId}')">Salvar alterações</button>
  `);
}
function saveEditTalhao(farmId, talhaoId){
  if(!requireAccess('Editor', 'editar um talhão')) return;
  const t = farms[farmId].talhoes.find(x=>x.id===talhaoId);
  t.stage = document.getElementById('et_stage').value.trim() || t.stage;
  t.status = document.getElementById('et_status').value;
  t.reason = document.getElementById('et_reason').value.trim() || t.reason;
  t.updated = 'agora';
  closeSheet();
  openCondition(farmId, talhaoId);
  registerChange(`Talhão "${t.name}" atualizado`);
}
function concluirTalhao(farmId, talhaoId){
  const t = farms[farmId].talhoes.find(x=>x.id===talhaoId);
  t.activity = t.activity==='—' ? '—' : t.activity + ' ✓ concluída';
  closeSheet();
  openCondition(farmId, talhaoId);
  showSuccessBurst();
  registerChange(`Atividade do talhão "${t.name}" concluída`);
}

function openReagendarAtividade(id){
  openSheet('Reagendar atividade', `
    <div class="form-field"><label>Nova data/hora</label><input id="ra2_when" placeholder="Ex: 21 ago, 08:00"></div>
    <button class="sheet-save" onclick="saveReagendarAtividade('${id}')">Confirmar reagendamento</button>
  `);
}
function saveReagendarAtividade(id){
  const when = document.getElementById('ra2_when').value.trim();
  if(!when){ showToast('Informe a nova data'); return; }
  const a = activities.find(x=>x.id===id);
  a.when = when; a.bucket = 'proximas';
  a.log = a.log||[]; a.log.push('Reagendada para '+when);
  closeSheet();
  openActivity(id); renderActivitiesList(); renderHome();
  registerChange(`Atividade "${a.title}" reagendada`);
}
function openJustificarAtividade(id){
  openSheet('Justificar atividade', `
    <div class="form-field"><label>Justificativa</label>
      <textarea id="ja_text" placeholder="Explique o motivo do atraso ou alteração"></textarea>
      <button type="button" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:6px;padding:7px;" onclick="startVoiceDictation('ja_text', this)">🎙️ Ditar por voz</button>
    </div>
    <button class="sheet-save" onclick="saveJustificarAtividade('${id}')">Salvar justificativa</button>
  `);
}
function saveJustificarAtividade(id){
  const text = document.getElementById('ja_text').value.trim();
  if(!text){ showToast('Escreva a justificativa'); return; }
  const a = activities.find(x=>x.id===id);
  a.log = a.log||[]; a.log.push('Justificativa: '+text);
  closeSheet();
  openActivity(id);
  registerChange(`Justificativa registrada em "${a.title}"`);
}
function concluirAtividade(id){
  const a = activities.find(x=>x.id===id);
  a.bucket = 'concluidas';
  a.when = 'Concluída — hoje';
  if(a.status) a.status = 'concluida';
  closeSheet();
  openActivity(id); renderActivitiesList(); renderHome();
  showSuccessBurst();
  registerChange(`Atividade "${a.title}" concluída`);
}

// ---------------------------------------------------------------
// RENDER: HOME
// ---------------------------------------------------------------
function farmCardHTML(f){
  return `<div class="farm-card" onclick="openProperty('${f.id}')">
    <div class="farm-photo" style="background:${f.color};${f.photoUrl?`background-image:url('${f.photoUrl}');background-size:cover;background-position:center;`:''}">${f.photoUrl?'':emojiIcon(f.icon,{size:20})}</div>
    <div class="farm-info">
      <div class="farm-name">${f.name}</div>
      <div class="farm-loc">${titleCasePt(f.city)}, ${f.state} · ${f.area}</div>
      <div class="farm-tags">
        ${f.type==='agro'?'<span class="tag agro">Agricultura</span>':''}
        ${f.type==='pec'?'<span class="tag pec">Pecuária</span>':''}
        ${f.type==='mista'?'<span class="tag agro">Agricultura</span><span class="tag pec">Pecuária</span>':''}
        ${farmAlertCount(f)>0?`<span class="tag alert">${farmAlertCount(f)} alerta${farmAlertCount(f)>1?'s':''}</span>`:''}
        ${f.pendingSync?`<span class="tag" style="background:#fff3de;color:#8a6a12;">aguardando envio</span>`:''}
      </div>
    </div>
    <div class="farm-right">
      <span class="chev">›</span>
      <span class="farm-weather">${emojiIcon(f.weather.icon,{size:14})} ${f.weather.temp}°</span>
    </div>
  </div>`;
}
function farmAlertCount(f){
  return (f.talhoes||[]).filter(t=>t.status==='atencao'||t.status==='desfavoravel').length;
}
function renderHome(){
  document.getElementById('homeFarmList').innerHTML = Object.values(farms).map(farmCardHTML).join('');
  const todays = activities.filter(a=>a.bucket==='hoje'||a.bucket==='atrasadas');
  document.getElementById('homeActivityList').innerHTML = todays.length ? todays.map(activityItemHTML).join('') : '<div class="empty-note">Nenhuma atividade atrasada ou para hoje.</div>';
  renderHomePriorityStats();
  updateModuleSummary();
  updateBellBadge();
  // Estes três só aparecem no modo desktop (o CSS esconde os elementos no
  // celular) — mas rodam sempre junto com o resto do Início, pra nunca
  // ficarem com dado desatualizado se a pessoa redimensionar a janela ou
  // girar entre celular/computador.
  renderHomeDesktopStats();
  renderHomePropertiesTable();
  renderWeekOpsBody();
}
// ---------------------------------------------------------------
// PAINEL DESKTOP — 4 cartões de resumo (mesma ideia do "Prioridades" de
// cima, só que com mais números de relance: propriedades, atividades em
// aberto, área monitorada e alertas ativos), no estilo cartão de sistema
// profissional.
function renderHomeDesktopStats(){
  const el = document.getElementById('homeDesktopStats');
  if(!el) return;
  const allFarms = Object.values(farms);
  const totalFarms = allFarms.length;
  const agroCount = allFarms.filter(f=>f.type==='agro'||f.type==='mista').length;
  const pecCount = allFarms.filter(f=>f.type==='pec'||f.type==='mista').length;
  const atrasadas = activities.filter(a=>a.bucket==='atrasadas').length;
  const hoje = activities.filter(a=>a.bucket==='hoje').length;
  const abertas = atrasadas + hoje;
  const areaTotal = allFarms.reduce((s,f)=>s + (parseInt(String(f.area).replace(/\./g,''), 10) || 0), 0);
  const alertasAtivos = notifications.filter(n=>!n.read).length;
  el.innerHTML = `
    <div class="dash-stat-card">
      <div class="dsc-ic" style="background:var(--brand-grad);">${svgIcon('map-pin',{size:18})}</div>
      <div class="dsc-num">${totalFarms}</div>
      <div class="dsc-lbl">Propriedades</div>
      <div class="dsc-sub">${agroCount} agricultura · ${pecCount} pecuária</div>
    </div>
    <div class="dash-stat-card" style="cursor:pointer;" onclick="goTab('screen-activities')">
      <div class="dsc-ic" style="background:var(--sky-grad);">${svgIcon('clipboard',{size:18})}</div>
      <div class="dsc-num">${abertas}</div>
      <div class="dsc-lbl">Atividades abertas</div>
      <div class="dsc-sub">${atrasadas} atrasada${atrasadas!==1?'s':''}</div>
    </div>
    <div class="dash-stat-card">
      <div class="dsc-ic" style="background:var(--brand-grad-soft);">${svgIcon('map',{size:18})}</div>
      <div class="dsc-num">${areaTotal.toLocaleString('pt-BR')} ha</div>
      <div class="dsc-lbl">Área monitorada</div>
      <div class="dsc-sub">${totalFarms} propriedade${totalFarms!==1?'s':''}</div>
    </div>
    <div class="dash-stat-card" style="cursor:pointer;" onclick="pushScreen('screen-notifications')">
      <div class="dsc-ic" style="background:${alertasAtivos>0?'var(--warning-grad)':'var(--brand-grad)'};">${svgIcon('warning',{size:18})}</div>
      <div class="dsc-num">${alertasAtivos}</div>
      <div class="dsc-lbl">Alertas ativos</div>
      <div class="dsc-sub">${alertasAtivos>0?'Precisam de atenção':'Tudo sob controle'}</div>
    </div>`;
}
// "Suas propriedades" em formato de tabela — a mesma informação dos
// cartões de baixo (#homeFarmList), só que num formato de linha/coluna que
// aproveita melhor uma tela larga (igual uma planilha/painel de gestão).
function renderHomePropertiesTable(){
  const el = document.getElementById('homePropertiesTable');
  if(!el) return;
  const rows = Object.values(farms).map(f=>{
    const alerts = farmAlertCount(f);
    const moduleLabel = f.type==='agro' ? 'Agricultura' : f.type==='pec' ? 'Pecuária' : 'Agricultura + Pecuária';
    const statusHTML = alerts>0
      ? `<span class="tag alert">${alerts} alerta${alerts>1?'s':''}</span>`
      : `<span class="tag agro">Saudável</span>`;
    return `<tr onclick="openProperty('${f.id}')">
      <td><div class="dt-farm-cell"><span class="dt-farm-dot" style="background:${f.color};"></span>${f.name}</div></td>
      <td>${titleCasePt(f.city)}, ${f.state}</td>
      <td>${f.area}</td>
      <td>${moduleLabel}</td>
      <td>${emojiIcon(f.weather.icon,{size:14})} ${f.weather.temp!=null?f.weather.temp+'°':'—'}</td>
      <td>${statusHTML}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table class="dash-table">
    <thead><tr><th>Propriedade</th><th>Localização</th><th>Área</th><th>Módulo</th><th>Temperatura</th><th>Status</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6"><div class="empty-note">Nenhuma propriedade cadastrada ainda.</div></td></tr>'}</tbody>
  </table>`;
}
// ---------------------------------------------------------------
// "OPERAÇÃO DA SEMANA" — cartão principal do painel desktop (Início),
// com 3 abas: Atividades (gráfico da semana + próximas), Agenda (lista
// cronológica) e Indicadores (as mesmas barras por status de antes).
// Números fictícios — mesma lógica do resto do protótipo (ver
// "DATA (fictício, apenas para o protótipo)" lá em cima).
// ---------------------------------------------------------------
let homeWeekOpsTab = 'atividades';
function setWeekOpsTab(tab){
  homeWeekOpsTab = tab;
  document.querySelectorAll('.dwo-tab').forEach(b=>b.classList.toggle('active', b.dataset.dwotab===tab));
  renderWeekOpsBody();
}
// Segunda a domingo da semana que contém a data-base do app (APP_TODAY) —
// mesma âncora usada em todo o resto dos dados fictícios do protótipo.
function weekOpsWeekDays(){
  const dow = APP_TODAY.getDay(); // 0=Dom..6=Sáb
  const mondayOffset = dow===0 ? -6 : 1-dow;
  const monday = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate()+mondayOffset);
  const days = [];
  for(let i=0;i<7;i++){ const d=new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()+i); days.push(d); }
  return days;
}
// Contagem de atividades por dia da semana (Seg..Dom) — ilustrativo, no
// mesmo espírito fictício dos outros números do protótipo.
const WEEK_ACTIVITY_TREND = [3, 2, 4, 6, 5, 5, 1];
function weekOpsChartHTML(){
  const days = weekOpsWeekDays();
  const values = WEEK_ACTIVITY_TREND;
  const max = Math.max(...values, 4);
  const W = 640, H = 176, padL = 22, padR = 4, padT = 8, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const stepX = plotW / values.length;
  const barW = Math.min(28, stepX*0.4);
  const yFor = v => padT + plotH - (v/max)*plotH;
  const xFor = i => padL + stepX*i + stepX/2;
  const steps = 4;
  const gridLines = Array.from({length:steps+1}, (_, i) => {
    const v = Math.round(max/steps*i);
    const y = yFor(v);
    return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--border)" stroke-width="1"/><text x="0" y="${y+3}" font-size="9" fill="var(--ink-muted)">${v}</text>`;
  }).join('');
  const bars = values.map((v,i)=>{
    const x = xFor(i)-barW/2, y = yFor(v), h = (padT+plotH)-y;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="var(--brand-dark)"/>`;
  }).join('');
  const linePts = values.map((v,i)=>`${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
  const dots = values.map((v,i)=>`<circle cx="${xFor(i).toFixed(1)}" cy="${yFor(v).toFixed(1)}" r="3" fill="var(--brand)" stroke="#fff" stroke-width="1.5"/>`).join('');
  const dayLabels = days.map((d,i)=>{
    const x = xFor(i).toFixed(1);
    return `<text x="${x}" y="${H-20}" font-size="9.5" text-anchor="middle" fill="var(--ink-2)" font-weight="700">${DIAS_SEMANA_PT[d.getDay()]}</text>`+
      `<text x="${x}" y="${H-8}" font-size="8.5" text-anchor="middle" fill="var(--ink-muted)">${String(d.getDate()).padStart(2,'0')} ${MESES_PT[d.getMonth()]}</text>`;
  }).join('');
  return `
    <div class="dwo-legend" style="justify-content:flex-end;margin-bottom:2px;">
      <span class="dwo-legend-item"><span class="dwo-legend-dot" style="background:var(--brand-dark);"></span>Atividades</span>
      <span class="dwo-legend-item"><span class="dwo-legend-line" style="background:var(--brand);"></span>Tendência</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
      ${gridLines}
      ${bars}
      <polyline points="${linePts}" fill="none" stroke="var(--brand)" stroke-width="2"/>
      ${dots}
      ${dayLabels}
    </svg>`;
}
function weekOpsUpcomingHTML(){
  const upcoming = activities.filter(a=>a.bucket==='atrasadas'||a.bucket==='hoje'||a.bucket==='proximas').slice(0,3);
  return `<div class="dwo-upcoming-title">Próximas atividades</div>${upcoming.length ? upcoming.map(activityItemHTML).join('') : '<div class="empty-note">Nenhuma atividade em aberto.</div>'}`;
}
function weekOpsAgendaHTML(){
  const upcoming = activities.filter(a=>a.bucket==='atrasadas'||a.bucket==='hoje'||a.bucket==='proximas');
  return upcoming.length ? upcoming.map(activityItemHTML).join('') : '<div class="empty-note">Nenhuma atividade agendada.</div>';
}
function weekOpsIndicadoresHTML(){
  const atrasadas = activities.filter(a=>a.bucket==='atrasadas').length;
  const hoje = activities.filter(a=>a.bucket==='hoje').length;
  const proximas = activities.filter(a=>a.bucket==='proximas').length;
  const max = Math.max(atrasadas, hoje, proximas, 1);
  const bar = (label, n, color) => `<div class="bar-row">
    <span class="bar-label">${label}</span>
    <span class="bar-track"><span class="bar-fill" style="width:${Math.round(n/max*100)}%;background:${color}"></span></span>
    <span class="bar-val">${n}</span>
  </div>`;
  return `${bar('Atrasadas', atrasadas, 'var(--critical)')}${bar('Hoje', hoje, 'var(--brand)')}${bar('Próx. 7 dias', proximas, 'var(--sky)')}`;
}
function renderWeekOpsBody(){
  const el = document.getElementById('homeWeekOpsBody');
  if(!el) return;
  if(homeWeekOpsTab==='agenda') el.innerHTML = weekOpsAgendaHTML();
  else if(homeWeekOpsTab==='indicadores') el.innerHTML = weekOpsIndicadoresHTML();
  else el.innerHTML = `<div class="dwo-chart-wrap">${weekOpsChartHTML()}</div>${weekOpsUpcomingHTML()}`;
}
// ---------------------------------------------------------------
// BUSCA DA BARRA SUPERIOR (modo desktop) — procura por nome de propriedade
// e título de atividade enquanto a pessoa digita, mostra uma listinha
// embaixo do campo, e clicar num resultado abre a tela certa direto,
// igual busca de sistema de verdade.
// ---------------------------------------------------------------
function handleDesktopSearch(query){
  const box = document.getElementById('dtSearchResults');
  if(!box) return;
  const q = (query||'').trim().toLowerCase();
  if(!q){ box.innerHTML=''; box.style.display='none'; return; }
  const farmHits = Object.values(farms).filter(f=>f.name.toLowerCase().includes(q) || f.city.toLowerCase().includes(q)).slice(0,4);
  const actHits = activities.filter(a=>a.title.toLowerCase().includes(q)).slice(0,4);
  const rows = [
    ...farmHits.map(f=>`<div class="dt-search-row" onmousedown="closeDesktopSearch();openProperty('${f.id}')">
      <span class="dt-search-ic">${svgIcon('map-pin',{size:14})}</span>
      <span><span class="dt-search-t">${f.name}</span><span class="dt-search-s">Propriedade · ${titleCasePt(f.city)}, ${f.state}</span></span>
    </div>`),
    ...actHits.map(a=>`<div class="dt-search-row" onmousedown="closeDesktopSearch();openActivity('${a.id}')">
      <span class="dt-search-ic">${svgIcon('clipboard',{size:14})}</span>
      <span><span class="dt-search-t">${a.title}</span><span class="dt-search-s">Atividade · ${farms[a.farm].name}</span></span>
    </div>`),
  ];
  box.innerHTML = rows.length ? rows.join('') : '<div class="dt-search-empty">Nada encontrado para "'+query+'"</div>';
  box.style.display = 'block';
}
function closeDesktopSearch(){
  const box = document.getElementById('dtSearchResults');
  if(box){ box.style.display='none'; }
  const input = document.getElementById('dtSearchInput');
  if(input){ input.value=''; }
}
function renderHomePriorityStats(){
  const el = document.getElementById('homePriorityStats');
  if(!el) return;
  const atrasadas = activities.filter(a=>a.bucket==='atrasadas').length;
  const hoje = activities.filter(a=>a.bucket==='hoje').length;
  const proximos7 = activities.filter(a=>a.bucket==='proximas').length;
  el.innerHTML = `<div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
    <div class="stat-tile" style="cursor:pointer;" onclick="goTab('screen-activities');actFilter='atrasadas';renderActivitiesFilters();renderActivitiesList();">
      <div class="stat-num" style="color:var(--critical);">${atrasadas}</div><div class="stat-lbl">atrasadas</div>
    </div>
    <div class="stat-tile" style="cursor:pointer;" onclick="goTab('screen-activities');actFilter='hoje';renderActivitiesFilters();renderActivitiesList();">
      <div class="stat-num">${hoje}</div><div class="stat-lbl">para hoje</div>
    </div>
    <div class="stat-tile" style="cursor:pointer;" onclick="goTab('screen-activities');actFilter='proximas';renderActivitiesFilters();renderActivitiesList();">
      <div class="stat-num">${proximos7}</div><div class="stat-lbl">próximos 7 dias</div>
    </div>
  </div>`;
}
function updateModuleSummary(){
  const allFarms = Object.values(farms);
  const talhaoCount = allFarms.reduce((s,f)=>s+(f.talhoes||[]).length,0);
  const atencaoCount = allFarms.reduce((s,f)=>s+(f.talhoes||[]).filter(t=>t.status==='atencao'||t.status==='desfavoravel').length,0);
  const loteCount = allFarms.reduce((s,f)=>s+(f.lotes||[]).length,0);
  const manejoHojeCount = activities.filter(a=>a.type==='pec' && (a.bucket==='hoje'||a.bucket==='atrasadas')).length;
  const agroEl = document.getElementById('agroModuleSummary');
  const pecEl = document.getElementById('pecModuleSummary');
  if(agroEl) agroEl.textContent = talhaoCount>0 ? `${atencaoCount} talhão(ões) em atenção de ${talhaoCount}` : 'Nenhum talhão cadastrado';
  if(pecEl) pecEl.textContent = loteCount>0 ? `${manejoHojeCount} lote(s) com manejo hoje` : 'Nenhum lote cadastrado';
}

// ---------------------------------------------------------------
// RENDER: PROPERTIES LIST
// ---------------------------------------------------------------
let propFilter = 'todas';
const PROP_FILTERS = [
  {id:'todas', label:'Todas'},
  {id:'agro', label:'Agricultura'},
  {id:'pec', label:'Pecuária'},
  {id:'mista', label:'Mista'},
];
function renderPropFilters(){
  const el = document.getElementById('propFilters');
  if(!el) return;
  el.innerHTML = PROP_FILTERS.map(f=>
    `<button class="chip-btn ${f.id===propFilter?'active':''}" data-pf="${f.id}">${f.label}</button>`).join('');
  el.querySelectorAll('.chip-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{ propFilter = btn.dataset.pf; renderPropFilters(); renderPropertiesList(); });
  });
}
function renderPropertiesList(){
  const list = propFilter==='todas' ? Object.values(farms) : Object.values(farms).filter(f=>f.type===propFilter);
  document.getElementById('propertiesFullList').innerHTML = list.length ? list.map(farmCardHTML).join('') : '<div class="empty-note">Nenhuma propriedade encontrada para este filtro.</div>';
  const countLabel = document.getElementById('propertiesCountLabel');
  if(countLabel){
    const total = Object.values(farms).length;
    countLabel.textContent = propFilter==='todas' ? `${total} fazenda${total!==1?'s':''} cadastrada${total!==1?'s':''}` : `${list.length} de ${total} fazendas · filtro: ${PROP_FILTERS.find(f=>f.id===propFilter).label}`;
  }
}
function openAllFarmsMapSheet(){
  const rows = Object.values(farms).map(f=>{
    const dotColor = f.type==='pec' ? 'var(--pec)' : 'var(--agro)';
    return `<div class="kv-row" style="cursor:pointer;" onclick="closeSheet(); openProperty('${f.id}');">
      <span class="k" style="display:flex;align-items:center;gap:7px;"><span style="width:9px;height:9px;border-radius:50%;background:${dotColor};flex:none;"></span>${f.name}</span>
      <span class="v">${titleCasePt(f.city)}, ${f.state}</span>
    </div>`;
  }).join('');
  openSheet('Mapa de todas as propriedades', `
    <div class="card" style="padding:0;overflow:hidden;">
      <div id="allFarmsMap" class="coord-map" style="height:240px;border:none;border-radius:0;"></div>
    </div>
    <div class="h-eyebrow" style="padding:10px 0 6px;">Propriedades</div>
    <div class="card">${rows}</div>
  `);
  setTimeout(()=>initAllFarmsMapView('allFarmsMap'), 150);
}
// Mapa consolidado com um pin colorido por propriedade (verde = agricultura,
// laranja = pecuária) — clicar no pin abre a propriedade direto, igual à
// lista logo abaixo.
function initAllFarmsMapView(elId){
  const el = document.getElementById(elId);
  if(!el || typeof L === 'undefined') return;
  const pts = Object.values(farms).map(f=>({f, c:parseCoords(f.coords)})).filter(x=>x.c);
  if(!pts.length){ el.innerHTML = '<div class="empty-note" style="margin:16px;">Nenhuma propriedade com coordenadas cadastradas ainda.</div>'; return; }
  const map = L.map(elId, { attributionControl:false, scrollWheelZoom:false }).setView([pts[0].c.lat, pts[0].c.lon], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
  pts.forEach(({f,c})=>{
    const color = f.type==='pec' ? '#eb6834' : '#008300';
    const icon = L.divIcon({
      className:'', iconSize:[26,30], iconAnchor:[13,28],
      html:`<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(20,30,20,.35);"></div>`,
    });
    const marker = L.marker([c.lat, c.lon], {icon}).addTo(map);
    marker.bindTooltip(f.name, {direction:'top', offset:[0,-26]});
    marker.on('click', ()=>{ closeSheet(); openProperty(f.id); });
  });
  if(pts.length>1) map.fitBounds(L.latLngBounds(pts.map(x=>[x.c.lat,x.c.lon])), {padding:[28,28]});
  setTimeout(()=>map.invalidateSize(), 200);
}

// ---------------------------------------------------------------
// RENDER: PROPERTY DETAIL
// ---------------------------------------------------------------
let pdActiveTab = 'overview';
function openProperty(id){
  const f = farms[id];
  window._currentFarm = id;
  pdActiveTab = 'overview';
  document.getElementById('pdName').textContent = f.name;
  document.getElementById('pdLoc').textContent = `${titleCasePt(f.city)}, ${f.state} · ${f.area}`;
  const tabs = [
    {id:'overview', label:'Visão geral'},
  ];
  if(f.type==='agro' || f.type==='mista' || (f.talhoes && f.talhoes.length)) tabs.push({id:'agro', label:'Agricultura'});
  if(f.type==='pec' || f.type==='mista' || (f.lotes && f.lotes.length)) tabs.push({id:'pec', label:'Pecuária'});
  tabs.push({id:'map', label:'Mapa'});
  tabs.push({id:'data', label:'Dados'});
  document.getElementById('pdTabs').innerHTML = tabs.map(t=>
    `<button class="tab-btn ${t.id==='overview'?'active':''}" data-pdtab="${t.id}">${t.label}</button>`).join('');
  document.querySelectorAll('#pdTabs .tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      pdActiveTab = btn.dataset.pdtab;
      document.querySelectorAll('#pdTabs .tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
      renderPropertyTab();
    });
  });
  renderPropertyTab();
  pushScreen('screen-property');
}
// ---------------------------------------------------------------
// APAGAR PROPRIEDADE — ação destrutiva e definitiva, por isso: só quem
// tem acesso de Administrador, com uma confirmação explícita antes.
// ---------------------------------------------------------------
function confirmDeleteFarm(farmId){
  const f = farms[farmId];
  if(!f) return;
  if(!requireAccess('Administrador', 'apagar uma propriedade')) return;
  openSheet('Apagar propriedade', `
    <div class="empty-note" style="background:#fbe6e6;color:var(--critical);border-color:#f0c9c9;">
      Isso vai apagar <strong>${f.name}</strong> e todos os talhões, lotes, animais e registros dela.
      Essa ação não pode ser desfeita.
    </div>
    <button type="button" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:12px;" onclick="closeSheet()">Cancelar</button>
    <button class="sheet-save" style="background:var(--critical);margin-top:8px;" onclick="deleteFarm('${farmId}')">Apagar propriedade</button>
  `);
}
async function deleteFarm(farmId){
  const f = farms[farmId];
  if(!f) return;
  const name = f.name;
  closeSheet();

  // Se a propriedade ainda nem tinha sido enviada pro servidor (cadastrada
  // offline e ainda na fila), basta tirar da fila — não existe nada pra
  // apagar do lado de fora. Cobre "insert" e qualquer "update" pendente dela.
  if(f.pendingSync){
    syncQueue = syncQueue.filter(op => !(op.entity==='farm' && (
      (op.kind==='insert' && op.payload.tempId===farmId) ||
      (op.kind==='update' && op.payload.id===farmId)
    )));
    saveSyncQueueToStorage();
    finishDeleteFarmLocally(farmId, name);
    return;
  }

  if(!BACKEND_ENABLED || !currentAuthUser){
    finishDeleteFarmLocally(farmId, name);
    return;
  }
  if(!navigator.onLine){
    enqueueSyncOp('farm', 'delete', { id: farmId });
    finishDeleteFarmLocally(farmId, name, true);
    return;
  }
  try{
    const { error } = await sb.from('farms').delete().eq('id', farmId);
    if(error){
      if(looksLikeNetworkError(error)){
        enqueueSyncOp('farm', 'delete', { id: farmId });
        finishDeleteFarmLocally(farmId, name, true);
      } else {
        showToast('Não foi possível apagar a propriedade: ' + (error.message || 'tente de novo.'));
      }
      return;
    }
    finishDeleteFarmLocally(farmId, name);
  }catch(e){
    enqueueSyncOp('farm', 'delete', { id: farmId });
    finishDeleteFarmLocally(farmId, name, true);
  }
}
function finishDeleteFarmLocally(farmId, name, pendingOffline){
  delete farms[farmId];
  if(window._currentFarm === farmId) window._currentFarm = null;
  if(homeWeatherFarmId === farmId) homeWeatherFarmId = null;
  // Limpa qualquer atividade/notificação/custo/registro de campo que ainda
  // apontasse pra essa propriedade — senão eles ficam "órfãos" e quebram a
  // tela na próxima vez que alguém tentar renderizá-los.
  const keepActivities = activities.filter(a=>a.farm!==farmId);
  activities.length = 0; activities.push(...keepActivities);
  notifications = notifications.filter(n=>n.farm!==farmId);
  const keepCosts = costLedger.filter(c=>c.farmId!==farmId);
  costLedger.length = 0; costLedger.push(...keepCosts);
  const keepRecords = fieldRecords.filter(r=>r.farmId!==farmId);
  fieldRecords.length = 0; fieldRecords.push(...keepRecords);
  goTab('screen-properties');
  renderPropertiesList();
  renderHomeWeatherSelect();
  renderWeatherCard('homeWeatherCard', homeWeatherFarmId);
  renderDesktopWeatherCard(homeWeatherFarmId);
  renderHome();
  renderNotifications();
  refreshSyncUI();
  showToast(pendingOffline
    ? `Sem conexão — "${name}" foi apagada no aparelho e a exclusão será enviada quando a internet voltar.`
    : `Propriedade "${name}" apagada.`);
}
function renderPropertyTab(){
  const f = farms[window._currentFarm];
  const el = document.getElementById('pdContent');
  if(pdActiveTab==='overview'){
    el.innerHTML = `
      <div id="pdWeatherCard" style="margin:12px 16px 10px;"></div>
      ${f.photoUrl ? `<div style="margin:0 16px 10px;border-radius:14px;overflow:hidden;height:140px;cursor:pointer;position:relative;" onclick="openFarmPhotoViewer('${f.id}')">
        <img src="${f.photoUrl}" style="width:100%;height:100%;object-fit:cover;">
        <span style="position:absolute;right:8px;bottom:8px;background:rgba(15,20,15,.55);color:#fff;font-size:10px;font-weight:700;padding:4px 9px;border-radius:20px;">Ver foto</span>
      </div>` : ''}
      <div class="card">
        <div class="kv-row"><span class="k">Tipo</span><span class="v">${f.type==='agro'?'Agricultura':f.type==='pec'?'Pecuária':'Mista'}</span></div>
        <div class="kv-row"><span class="k">Área total</span><span class="v">${f.area}</span></div>
        <div class="kv-row" style="cursor:pointer;" onclick="openEditFarmLocation('${f.id}')"><span class="k">Coordenadas</span><span class="v">${parseCoords(f.coords)?f.coords:'Adicionar ›'}</span></div>
        <div class="kv-row"><span class="k">Talhões</span><span class="v">${(f.talhoes||[]).length}</span></div>
        <div class="kv-row"><span class="k">Lotes / animais</span><span class="v">${(f.lotes||[]).length} / ${(f.animals||[]).length}</span></div>
      </div>
      <div class="link-card" onclick="openEditFarmDescription('${f.id}')">
        <div class="lc-ic bg-brand">${svgIcon(f.description?'pencil':'clipboard',{size:18})}</div>
        <div class="lc-body">
          <div class="lc-title">Descrição</div>
          <div class="lc-sub">${f.description ? f.description.replace(/</g,'&lt;') : 'Toque para adicionar uma descrição da propriedade'}</div>
        </div>
        ${svgIcon('chevron-right',{size:16,style:'color:var(--ink-muted);flex:0 0 auto;'})}
      </div>
      ${dailyChecklistCardHTML(f)}
      <div class="fab-row">
        <button class="fab-btn" onclick="openRouteToFarm('${f.id}')">${ROUTE_SVG} Traçar rota até a propriedade</button>
        <button class="fab-btn ghost" onclick="openAddFieldRecordForm('${f.id}')">${svgIcon('camera',{size:14})} Novo registro de campo</button>
        <button class="fab-btn ghost" onclick="openChangeFarmPhoto('${f.id}')">${svgIcon('image',{size:14})} ${f.photoUrl?'Trocar':'Adicionar'} foto</button>
      </div>
      <div class="h-eyebrow section-pad">Equipe autorizada</div>
      <div class="card">${f.team.map(t=>`<div class="kv-row"><span class="k">${t}</span></div>`).join('')}</div>
      <div class="h-eyebrow section-pad">Atividades recentes e próximas</div>
      ${activities.filter(a=>a.farm===f.id).map(activityItemHTML).join('') || '<div class="empty-note">Nenhuma atividade cadastrada ainda.</div>'}
    `;
    renderWeatherCard('pdWeatherCard', f.id);
  } else if(pdActiveTab==='agro'){
    el.innerHTML = `${agroResumoCardHTML(f)}<div class="qa-grid">
        <div class="qa-tile" onclick="openInputsSheet('${f.id}')"><div class="qa-ic bg-brand">${svgIcon('wheat',{size:18})}</div><div class="qa-label">Insumos e estoque</div></div>
        <div class="qa-tile" onclick="openMachinesSheet('${f.id}')"><div class="qa-ic bg-ink">${svgIcon('tractor',{size:18})}</div><div class="qa-label">Máquinas e equipamentos</div></div>
      </div>
      <div class="h-eyebrow section-pad section-header-row">
        <span>Condições operacionais<br>por talhão</span>
        <button type="button" class="fab-btn ghost" style="padding:5px 11px;font-size:10.5px;" onclick="openAddTalhaoForm('${f.id}')">＋ Novo talhão</button>
      </div>` +
      (f.talhoes.map(t=>`
      <div class="talhao-card" onclick="openCondition('${f.id}','${t.id}')">
        <div class="talhao-top">
          <span class="talhao-name">${t.name}</span>
          <span class="status-chip ${t.status}"><span class="sic">${emojiIcon(statusMeta[t.status].icon,{size:12})}</span>${statusMeta[t.status].label}</span>
        </div>
        <div class="talhao-meta">${t.area} ha · ${t.cultura&&t.cultura!=='—'?t.cultura+' · ':''}${t.variedade&&t.variedade!=='—'?t.variedade+' · ':''}Safra ${t.safra||'—'} · Estágio: ${t.stage}</div>
        <div class="talhao-meta">${t.activity}</div>
      </div>`).join('') || '<div class="empty-note">Nenhum talhão cadastrado ainda.</div>');
  } else if(pdActiveTab==='pec'){
    el.innerHTML = `${pecResumoCardHTML(f)}<div class="qa-grid">
        <div class="qa-tile" onclick="openSanidadeSheet('${f.id}')"><div class="qa-ic bg-pec">${svgIcon('stethoscope',{size:18})}</div><div class="qa-label">Sanidade do rebanho</div></div>
        <div class="qa-tile" onclick="openFeedSheet('${f.id}')"><div class="qa-ic bg-brand">${svgIcon('wheat',{size:18})}</div><div class="qa-label">Alimentação</div></div>
        <div class="qa-tile" onclick="openMutiraoForm('${f.id}')"><div class="qa-ic bg-ink">${svgIcon('users',{size:18})}</div><div class="qa-label">Modo mutirão</div></div>
      </div>
      <div class="h-eyebrow section-pad section-header-row">
        <span>Lotes</span>
        <button type="button" class="fab-btn ghost" style="padding:5px 11px;font-size:10.5px;" onclick="openAddLoteForm('${f.id}')">＋ Novo lote</button>
      </div>` +
      (f.lotes.map(l=>`
      <div class="lote-card">
        <div class="talhao-top"><span class="talhao-name">${l.name}</span><span class="talhao-meta">${l.qty} animais</span></div>
        <div class="talhao-meta">${l.category} · ${l.pasture}</div>
      </div>`).join('') || '<div class="empty-note">Nenhum lote cadastrado ainda.</div>') +
      `<div class="h-eyebrow section-pad section-header-row">
        <span>Pastagens</span>
        <button type="button" class="fab-btn ghost" style="padding:5px 11px;font-size:10.5px;" onclick="openAddPastureForm('${f.id}')">＋ Novo pasto</button>
      </div>` +
      ((f.pastures||[]).map(p=>{
        const count = f.animals.filter(a=>a.pastureId===p.id && a.statusPlantel==='Ativo').length;
        const lotacao = p.area ? (count/p.area).toFixed(2) : '—';
        const rotationTxt = p.nextRotation ? `Rotação planejada: ${fmtDate(p.nextRotation)}${p.nextRotationTarget?' → '+p.nextRotationTarget:''}` : null;
        const alert = pastureStockingAlert(p, count);
        return `<div class="lote-card">
          <div class="talhao-top">
            <span class="talhao-name">${p.name}</span>
            <button class="chip-btn ${p.status==='Em uso'?'active':''}" style="padding:3px 9px;font-size:10px;" onclick="togglePastureStatus('${f.id}','${p.id}')">${p.status}</button>
          </div>
          <div class="talhao-meta">${p.area} ha · capacidade ${p.capacity} cab. · ${count} animais agora</div>
          <div class="talhao-meta">Taxa de lotação: ${lotacao} cab/ha · desde ${fmtDate(p.enteredDate)}</div>
          ${rotationTxt ? `<div class="talhao-meta">📅 ${rotationTxt}</div>` : ''}
          ${alert ? `<div class="empty-note" style="margin-top:6px;${alert.level==='critico'?'background:#fbe6e6;color:var(--critical);border-color:#f0c9c9;':''}">${alert.text}</div>` : ''}
          <button class="action-btn" style="margin-top:6px;" onclick="openPlanRotationForm('${f.id}','${p.id}')">Planejar rotação</button>
        </div>`;
      }).join('') || '<div class="empty-note">Nenhum pasto cadastrado ainda.</div>') +
      `<div class="h-eyebrow section-pad section-header-row">
        <span>Animais</span>
        <button type="button" class="fab-btn" style="padding:5px 11px;font-size:10.5px;" onclick="openAddAnimalForm('${f.id}')">＋ Novo animal</button>
      </div>` +
      renderAnimalListSection(f);
  } else if(pdActiveTab==='map'){
    const coords = parseCoords(f.coords);
    el.innerHTML = `
      ${coords ? `<div class="card" style="padding:0;overflow:hidden;margin:0 16px 10px;">
        <div id="pdMapView" class="coord-map" style="height:220px;border:none;border-radius:0;"></div>
      </div>` : '<div class="empty-note">Cadastre a localização da propriedade pra ver o mapa e traçar rota até ela.</div>'}
      <div class="fab-row">
        <button class="fab-btn" onclick="openRouteToFarm('${f.id}')">${ROUTE_SVG} Traçar rota até a propriedade</button>
        <button class="fab-btn ghost" onclick="openEditFarmLocation('${f.id}')">${LOCATION_SVG} ${coords?'Editar localização':'Adicionar localização'}</button>
      </div>
    `;
    if(coords) setTimeout(()=>initFarmMapView('pdMapView', coords), 150);
  } else if(pdActiveTab==='data'){
    el.innerHTML = `<div class="card">
      <div class="kv-row" style="cursor:pointer;" onclick="exportPDF('${f.id}')"><span class="k">Exportar PDF</span><span class="v">›</span></div>
      <div class="kv-row" style="cursor:pointer;" onclick="exportCSV('${f.id}')"><span class="k">Exportar planilha</span><span class="v">›</span></div>
      <div class="kv-row" style="cursor:pointer;" onclick="shareWhatsApp('${f.id}')"><span class="k">Compartilhar via WhatsApp</span><span class="v">›</span></div>
      <div class="kv-row"><span class="k">Histórico de alterações</span><span class="v">›</span></div>
    </div>`;
  }
}

// ---------------------------------------------------------------
// RENDER: CONDITION DETAIL
// ---------------------------------------------------------------
// Acha o par "safra atual x anterior" pra comparar num mesmo talhão.
// cropHistory é preenchido em ordem mais-recente-primeiro (unshift) só na
// conclusão da colheita (saveConcluirColheita) — então, se a safra em
// andamento (t.actualYield ainda null) não colheu, cropHistory[0] já É a
// anterior; se a atual acabou de ser colhida, ela mesma virou cropHistory[0]
// e a anterior de verdade é cropHistory[1].
function talhaoSafraComparison(t){
  const hist = t.cropHistory || [];
  if(!hist.length) return null;
  const current = t.actualYield!=null ? hist[0] : null;
  const previous = current ? hist[1] : hist[0];
  if(!previous) return null;
  return {current, previous};
}
function openCondition(farmId, talhaoId){
  const f = farms[farmId];
  const t = f.talhoes.find(x=>x.id===talhaoId);
  document.getElementById('condSub').textContent = `${f.name} · ${t.name}`;
  const w = f.weather;
  const factorsHTML = (w && w.live && t.operationType) ? `
    <div class="card">
      <div class="h-eyebrow" style="padding:0 0 6px;margin:0;">O que foi analisado (${t.operationType})</div>
      <div class="kv-row"><span class="k">Chance de chuva</span><span class="v">${w.rain}%</span></div>
      <div class="kv-row"><span class="k">Vento</span><span class="v">${Math.round(w.windspeed)} km/h</span></div>
      <div class="kv-row"><span class="k">Temperatura</span><span class="v">${w.temp}°C</span></div>
      <div class="kv-row"><span class="k">Chuva acumulada (3 dias)</span><span class="v">${w.pastRainMm} mm</span></div>
    </div>` : '';
  const pestHTML = (t.pestLog||[]).length ? t.pestLog.map(p=>`
    <div class="kv-row"><span class="k">${fmtDate(p.d)} — ${p.praga} (${p.nivel})</span><span class="v">próx. vistoria ${fmtDate(p.nextInspection)}</span></div>`).join('')
    : '<div class="kv-row"><span class="k">Nenhum registro de praga/doença</span></div>';
  const appsHTML = (t.applications||[]).length ? t.applications.map(ap=>`
    <div class="kv-row"><span class="k">${fmtDate(ap.d)} — ${ap.produto}${ap.dose?' · '+ap.dose:''}</span><span class="v">${ap.responsible||'—'}</span></div>
    ${ap.liberadoEm ? `<div class="kv-row"><span class="k" style="color:var(--ink-muted);">Carência ${ap.carenciaDias} dia(s)</span><span class="v" style="color:var(--ink-muted);">liberado a partir de ${fmtDate(ap.liberadoEm)}</span></div>` : ''}`).join('')
    : '<div class="kv-row"><span class="k">Nenhuma aplicação de defensivo registrada</span></div>';
  // Rastreabilidade: se há previsão de colheita e alguma aplicação recente
  // ainda está em carência quando essa colheita chegar, avisa — é o tipo de
  // coisa fácil de esquecer numa planilha solta, mas crítica pro produto
  // não sair contaminado ou fora da norma.
  const activeWithdrawal = (t.applications||[]).find(ap=>ap.liberadoEm && daysFromToday(ap.liberadoEm) > 0);
  const harvestBeforeSafe = activeWithdrawal && t.previsaoColheita && parseISO(t.previsaoColheita) < parseISO(activeWithdrawal.liberadoEm);
  const cropHistoryHTML = (t.cropHistory||[]).length ? t.cropHistory.map(c=>`
    <div class="kv-row"><span class="k">${c.safra} — ${c.cultura}${c.variedade&&c.variedade!=='—'?' ('+c.variedade+')':''}</span><span class="v">${c.yield||'—'}</span></div>`).join('')
    : '<div class="kv-row"><span class="k">Sem histórico de safras anteriores</span></div>';
  // Compara a produtividade da safra atual (quando já colhida) com a
  // anterior neste mesmo talhão — ou, enquanto a atual ainda está no
  // campo, mostra a anterior como referência pra quando a colheita fechar.
  const safraCmp = talhaoSafraComparison(t);
  let safraCmpHTML = '';
  if(safraCmp && safraCmp.current){
    const curYield = parseFloat(safraCmp.current.yield), prevYield = parseFloat(safraCmp.previous.yield);
    const delta = (!isNaN(curYield) && !isNaN(prevYield) && prevYield>0) ? ((curYield-prevYield)/prevYield*100) : null;
    safraCmpHTML = `<div class="card">
      <div class="h-eyebrow" style="padding:0 0 6px;margin:0;">Safra atual x anterior</div>
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-num">${safraCmp.current.yield||'—'}</div><div class="stat-lbl">${safraCmp.current.safra||'Atual'}</div></div>
        <div class="stat-tile"><div class="stat-num">${safraCmp.previous.yield||'—'}</div><div class="stat-lbl">${safraCmp.previous.safra||'Anterior'}</div></div>
      </div>
      ${delta!=null ? `<div class="kv-row"><span class="k">Variação de produtividade</span><span class="v" style="color:${delta<0?'var(--critical)':'var(--good)'};">${delta>=0?'+':''}${delta.toFixed(1)}%</span></div>` : ''}
    </div>`;
  } else if(safraCmp && !safraCmp.current){
    safraCmpHTML = `<div class="card">
      <div class="h-eyebrow" style="padding:0 0 6px;margin:0;">Safra anterior neste talhão</div>
      <div class="kv-row"><span class="k">${safraCmp.previous.safra} — ${safraCmp.previous.cultura}${safraCmp.previous.variedade&&safraCmp.previous.variedade!=='—'?' ('+safraCmp.previous.variedade+')':''}</span><span class="v">${safraCmp.previous.yield||'—'}</span></div>
      <div style="font-size:11px;color:var(--ink-muted);padding-top:4px;">Referência pra comparar com a safra atual (${t.safra||'—'}) quando ela for colhida.</div>
    </div>`;
  }
  document.getElementById('condContent').innerHTML = `
    <div class="card" style="margin-top:12px;text-align:center;">
      <span class="status-chip ${t.status}" style="font-size:13px;padding:6px 14px;"><span class="sic">${emojiIcon(statusMeta[t.status].icon,{size:12})}</span>${statusMeta[t.status].label}</span>
      <div style="font-size:11px;color:var(--ink-muted);margin-top:8px;">Atualizado às ${t.updated}${w&&w.live?' · clima ao vivo':' · última classificação salva'}</div>
    </div>
    <div class="card">
      <div class="kv-row"><span class="k">Motivo</span></div>
      <div style="font-size:12px;color:var(--ink-2);line-height:1.5;padding:4px 0 8px;">${t.reason}</div>
      <div class="kv-row"><span class="k">Atividade vinculada</span><span class="v">${t.activity}</span></div>
      <div class="kv-row"><span class="k">Responsável</span><span class="v">${t.responsible}</span></div>
      <div class="kv-row"><span class="k">Talhão / área</span><span class="v">${t.name} · ${t.area} ha</span></div>
      <div class="kv-row"><span class="k">Cultura</span><span class="v">${t.cultura||'—'}</span></div>
      <div class="kv-row"><span class="k">Cultivar / safra</span><span class="v">${t.variedade||'—'} · ${t.safra||'—'}</span></div>
      <div class="kv-row"><span class="k">Estágio da cultura</span><span class="v">${t.stage}</span></div>
      ${t.dataPlantio?`<div class="kv-row"><span class="k">Data de plantio</span><span class="v">${fmtDate(t.dataPlantio)}</span></div>`:''}
      ${t.previsaoColheita?`<div class="kv-row"><span class="k">Previsão de colheita</span><span class="v">${fmtDate(t.previsaoColheita)}</span></div>`:''}
      ${t.nextWindow?`<div class="kv-row"><span class="k">Próxima janela favorável</span><span class="v">${t.nextWindow}</span></div>`:''}
    </div>
    ${factorsHTML}
    ${t.status==='dados'?'<div class="empty-note">Não é possível classificar: não há fonte climática cadastrada para este talhão.</div>':''}
    <button class="action-btn" style="margin:0 16px 10px;width:calc(100% - 32px);" onclick="openFullForecastSheet('${farmId}')"><span style="display:inline-flex;align-items:center;gap:5px;">${svgIcon('rain',{size:14})} Ver previsão completa da fazenda</span></button>
    <div class="h-eyebrow section-pad">Ações</div>
    <div class="action-row">
      <button class="action-btn" onclick="openReagendarTalhao('${farmId}','${talhaoId}')">Reagendar</button>
      <button class="action-btn" onclick="openEditTalhao('${farmId}','${talhaoId}')">Editar</button>
      <button class="action-btn primary" onclick="${t.operationType==='Colheita' ? `openConcluirColheita('${farmId}','${talhaoId}')` : `concluirTalhao('${farmId}','${talhaoId}')`}">Manter / Concluir</button>
    </div>
    ${safraCmpHTML}
    <div class="h-eyebrow section-pad">Histórico de culturas do talhão</div>
    <div class="card">${cropHistoryHTML}</div>
    <div class="h-eyebrow section-pad">Monitoramento de pragas e doenças</div>
    <div class="card">${pestHTML}</div>
    <button class="action-btn" style="margin:0 16px 10px;width:calc(100% - 32px);" onclick="openAddPestLog('${farmId}','${talhaoId}')"><span style="display:inline-flex;align-items:center;gap:5px;">${svgIcon('magnifier',{size:14})} Registrar praga ou doença</span></button>
    <div class="h-eyebrow section-pad">Histórico de aplicações de defensivos</div>
    <div class="card">${appsHTML}</div>
    ${activeWithdrawal ? `<div class="empty-note"${harvestBeforeSafe?' style="background:#fbe6e6;color:var(--critical);border-color:#f0c9c9;"':''}">${harvestBeforeSafe?'⛔':'⏳'} ${activeWithdrawal.produto} em carência até ${fmtDate(activeWithdrawal.liberadoEm)}${harvestBeforeSafe?' — a colheita prevista ('+fmtDate(t.previsaoColheita)+') cai ANTES do fim da carência. Não colha nem comercialize antes dessa data.':'.'}</div>` : ''}
    <button class="action-btn" style="margin:0 16px 10px;width:calc(100% - 32px);" onclick="openAddApplicationLog('${farmId}','${talhaoId}')"><span style="display:inline-flex;align-items:center;gap:5px;">${svgIcon('bottle',{size:14})} Registrar aplicação de defensivo</span></button>
    <div class="empty-note">Limite técnico: o clima não confirma sozinho que a lavoura está pronta — os critérios seguem a fonte técnica cadastrada.</div>
  `;
  pushScreen('screen-condition');
}
function openAddPestLog(farmId, talhaoId){
  openSheet('Registrar praga ou doença', `
    <div class="form-field"><label>Praga ou doença identificada</label><input id="pl_praga" placeholder="Ex: Ferrugem asiática"></div>
    <div class="form-field"><label>Nível de infestação</label>${styledSelectHTML('pl_nivel', ['Baixo','Médio','Alto'].map(v=>({value:v,label:v})), 'Baixo')}</div>
    <div class="toggle-row"><span class="tlabel">Fotografar o problema (simulado)</span><input type="checkbox" id="pl_foto" style="width:18px;height:18px;"></div>
    <div class="toggle-row"><span class="tlabel">Marcar localização no talhão (GPS simulado)</span><input type="checkbox" id="pl_gps" style="width:18px;height:18px;"></div>
    <div class="form-field"><label>Programar nova vistoria</label>${styledDateHTML('pl_next', '')}</div>
    <button class="sheet-save" onclick="savePestLog('${farmId}','${talhaoId}')">Registrar</button>
  `);
}
function savePestLog(farmId, talhaoId){
  const praga = document.getElementById('pl_praga').value.trim();
  if(!praga){ showToast('Informe a praga ou doença'); return; }
  const t = farms[farmId].talhoes.find(x=>x.id===talhaoId);
  t.pestLog = t.pestLog || [];
  const foto = document.getElementById('pl_foto').checked, gps = document.getElementById('pl_gps').checked;
  t.pestLog.unshift({d:isoToday(), praga, nivel:document.getElementById('pl_nivel').value,
    obs:[foto?'📷 foto anexada':null, gps?'📍 GPS registrado':null].filter(Boolean).join(', '),
    nextInspection: document.getElementById('pl_next').value || null});
  closeSheet();
  openCondition(farmId, talhaoId);
  registerChange(`Monitoramento registrado: ${praga} em ${t.name}`);
}
// Registro manual de aplicação de defensivo — existe além do registro
// automático ao "dar baixa" no estoque (consumeInput), porque nem toda
// aplicação passa pelo controle de insumos (produto comprado à parte,
// aplicação de terceiro/prestador de serviço etc.). É esse registro que dá
// rastreabilidade de verdade: produto, dose e carência, com aviso se a
// colheita estiver marcada antes do fim do prazo de carência.
function openAddApplicationLog(farmId, talhaoId){
  openSheet('Registrar aplicação de defensivo', `
    <div class="form-field"><label>Produto aplicado</label><input id="ap_produto" placeholder="Ex: Herbicida Glifosato"></div>
    <div class="form-row2">
      <div class="form-field"><label>Dose (opcional)</label><input id="ap_dose" placeholder="Ex: 2 L/ha"></div>
      <div class="form-field"><label>Carência (dias, opcional)</label><input id="ap_carencia" type="number" placeholder="Ex: 14"></div>
    </div>
    <div class="form-field"><label>Responsável</label><input id="ap_resp" value="${currentViewMember().name}"></div>
    <button class="sheet-save" onclick="saveApplicationLog('${farmId}','${talhaoId}')">Registrar aplicação</button>
  `);
}
function saveApplicationLog(farmId, talhaoId){
  const produto = document.getElementById('ap_produto').value.trim();
  if(!produto){ showToast('Informe o produto aplicado'); return; }
  const t = farms[farmId].talhoes.find(x=>x.id===talhaoId);
  const dose = document.getElementById('ap_dose').value.trim() || null;
  const carenciaRaw = document.getElementById('ap_carencia').value;
  const carenciaDias = carenciaRaw ? parseInt(carenciaRaw) : null;
  const liberadoEm = carenciaDias ? addDaysISO(isoToday(), carenciaDias) : null;
  const responsible = document.getElementById('ap_resp').value.trim() || currentViewMember().name;
  t.applications = t.applications || [];
  t.applications.unshift({d:isoToday(), produto, dose, carenciaDias, liberadoEm, responsible});
  closeSheet();
  openCondition(farmId, talhaoId);
  registerChange(`Aplicação registrada em "${t.name}": ${produto}`);
}
function openConcluirColheita(farmId, talhaoId){
  openSheet('Concluir colheita', `
    <div class="form-field"><label>Produtividade realizada (sc/ha)</label><input id="ch_yield" type="number" placeholder="Ex: 58"></div>
    <button class="sheet-save" onclick="saveConcluirColheita('${farmId}','${talhaoId}')">Confirmar colheita</button>
  `);
}
function saveConcluirColheita(farmId, talhaoId){
  const y = parseFloat(document.getElementById('ch_yield').value);
  if(!y){ showToast('Informe a produtividade realizada'); return; }
  const t = farms[farmId].talhoes.find(x=>x.id===talhaoId);
  t.actualYield = y;
  t.activity = t.activity==='—' ? '—' : t.activity + ' ✓ colhido';
  t.cropHistory = t.cropHistory || [];
  t.cropHistory.unshift({safra:t.safra, cultura:t.cultura, variedade:t.variedade, yield:`${y} sc/ha`});
  const activeWithdrawal = (t.applications||[]).find(ap=>ap.liberadoEm && daysFromToday(ap.liberadoEm) > 0);
  closeSheet();
  openCondition(farmId, talhaoId);
  showSuccessBurst();
  registerChange(`Colheita do talhão "${t.name}" concluída — ${y} sc/ha`);
  if(activeWithdrawal){
    showToast(`⚠ Atenção: "${t.name}" ainda estava em carência de ${activeWithdrawal.produto} até ${fmtDate(activeWithdrawal.liberadoEm)} quando a colheita foi concluída.`);
  }
}

// ---------------------------------------------------------------
// INSUMOS E ESTOQUE — sementes, fertilizantes, defensivos, combustíveis
// ---------------------------------------------------------------
function openInputsSheet(farmId){
  renderInputsBody(farmId);
}
function renderInputsBody(farmId){
  const f = farms[farmId];
  f.inputs = f.inputs || [];
  const rows = f.inputs.map(item=>{
    const low = item.stock <= item.minStock;
    const pct = Math.min(100, Math.round(item.stock/(item.minStock*2)*100));
    const expiringSoon = item.validade && daysFromToday(item.validade)!=null && daysFromToday(item.validade)<=60 && daysFromToday(item.validade)>=0;
    return `<div class="card" style="margin-bottom:8px;">
      <div class="kv-row"><span class="k"><b>${item.name}</b> · ${item.type}</span>${low?'<span class="tag alert">Estoque baixo</span>':''}</div>
      <div class="bar-track" style="margin:6px 0;"><span class="bar-fill" style="width:${pct}%;background:${low?'var(--critical)':'var(--agro)'}"></span></div>
      <div class="kv-row"><span class="k">Estoque</span><span class="v">${item.stock} ${item.unit} (mín. ${item.minStock})</span></div>
      <div class="kv-row"><span class="k">Custo</span><span class="v">R$ ${item.costPerUnit.toFixed(2)} / ${item.unit}</span></div>
      <div class="kv-row"><span class="k">Lote</span><span class="v">${item.lote||'—'}</span></div>
      ${item.validade?`<div class="kv-row"><span class="k">Validade</span><span class="v">${fmtDate(item.validade)}${expiringSoon?' ⚠️':''}</span></div>`:''}
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button class="action-btn" onclick="openConsumeInputForm('${f.id}','${item.id}')">Registrar uso</button>
        <button class="action-btn ghost" onclick="openRestockInputForm('${f.id}','${item.id}')">＋ Repor estoque</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty-note">Nenhum insumo cadastrado.</div>';

  openSheet(`Insumos e estoque — ${f.name}`, `
    ${rows}
    <div class="h-eyebrow" style="padding:8px 0 4px;">Novo item</div>
    <div class="form-row2">
      <div class="form-field"><label>Nome</label><input id="ni_name" placeholder="Ex: Semente de milho AG 8088"></div>
      <div class="form-field"><label>Tipo</label>${styledSelectHTML('ni_type', ['Sementes','Fertilizantes','Defensivos','Combustíveis'].map(v=>({value:v,label:v})), 'Sementes')}</div>
    </div>
    <div class="form-row2">
      <div class="form-field"><label>Estoque inicial</label><input id="ni_stock" type="number" placeholder="Ex: 100"></div>
      <div class="form-field"><label>Unidade</label>${styledSelectHTML('ni_unit', ['sacos','kg','toneladas','litros'].map(v=>({value:v,label:v})), 'sacos')}</div>
    </div>
    <div class="form-row2">
      <div class="form-field"><label>Custo por unidade (R$)</label><input id="ni_cost" type="number" placeholder="Ex: 420"></div>
      <div class="form-field"><label>Estoque mínimo (alerta)</label><input id="ni_min" type="number" placeholder="Ex: 60"></div>
    </div>
    <div class="form-row2">
      <div class="form-field"><label>Lote (opcional)</label><input id="ni_lote" placeholder="Ex: L2026-05"></div>
      <div class="form-field"><label>Validade (opcional)</label>${styledDateHTML('ni_validade', '')}</div>
    </div>
    <button class="sheet-save" onclick="addInputItem('${farmId}')">Adicionar item</button>
  `);
}
function addInputItem(farmId){
  const name = document.getElementById('ni_name').value.trim();
  if(!name){ showToast('Dê um nome para o item'); return; }
  const f = farms[farmId];
  f.inputs.push({id:newId('in'), name, type:document.getElementById('ni_type').value,
    stock:parseFloat(document.getElementById('ni_stock').value)||0, unit:document.getElementById('ni_unit').value,
    costPerUnit:parseFloat(document.getElementById('ni_cost').value)||0, minStock:parseFloat(document.getElementById('ni_min').value)||0,
    lote:document.getElementById('ni_lote').value.trim()||'—', validade:document.getElementById('ni_validade').value||null});
  renderInputsBody(farmId);
  registerChange(`Insumo "${name}" cadastrado`);
}
function openConsumeInputForm(farmId, inputId){
  const item = farms[farmId].inputs.find(x=>x.id===inputId);
  const f = farms[farmId];
  const isDefensivo = item.type==='Defensivos';
  const talhaoOptions = [{value:'',label:'— Não vincular a um talhão —'}].concat((f.talhoes||[]).map(t=>({value:t.id,label:t.name})));
  openSheet('Registrar uso — ' + item.name, `
    <div class="form-row2">
      <div class="form-field"><label>Talhão (opcional — calcula custo/ha)</label>${styledSelectHTML('ci_talhao', talhaoOptions, '')}</div>
      <div class="form-field"><label>Quantidade (${item.unit})</label><input id="ci_qty" type="number" placeholder="Ex: 20"></div>
    </div>
    ${isDefensivo ? `
    <div class="form-row2">
      <div class="form-field"><label>Dose aplicada (opcional)</label><input id="ci_dose" placeholder="Ex: 2 L/ha"></div>
      <div class="form-field"><label>Carência (dias, opcional)</label><input id="ci_carencia" type="number" placeholder="Ex: 14"></div>
    </div>
    <div class="empty-note" style="margin:-6px 0 12px;">Rastreabilidade: com a carência preenchida, o app avisa se a colheita estiver marcada antes do fim do prazo.</div>` : ''}
    <button class="sheet-save" onclick="consumeInput('${farmId}','${inputId}')">Registrar uso</button>
  `);
}
function openRestockInputForm(farmId, inputId){
  const item = farms[farmId].inputs.find(x=>x.id===inputId);
  openSheet('Repor estoque — ' + item.name, `
    <div class="form-row2">
      <div class="form-field"><label>Quantidade recebida (${item.unit})</label><input id="ri_qty" type="number" placeholder="Ex: 50"></div>
      <div class="form-field"><label>Novo lote (opcional)</label><input id="ri_lote" placeholder="Ex: L2026-09"></div>
    </div>
    <div class="form-field"><label>Nova validade (opcional)</label>${styledDateHTML('ri_validade', item.validade||'')}</div>
    <button class="sheet-save" onclick="restockInput('${farmId}','${inputId}')">Confirmar entrada</button>
  `);
}
function restockInput(farmId, inputId){
  const qty = parseFloat(document.getElementById('ri_qty').value);
  if(!qty){ showToast('Informe a quantidade recebida'); return; }
  const f = farms[farmId];
  const item = f.inputs.find(x=>x.id===inputId);
  item.stock += qty;
  const novoLote = document.getElementById('ri_lote').value.trim();
  if(novoLote) item.lote = novoLote;
  const novaValidade = document.getElementById('ri_validade').value;
  if(novaValidade) item.validade = novaValidade;
  renderInputsBody(farmId);
  registerChange(`Entrada de estoque: +${qty} ${item.unit} de ${item.name}`);
}
function consumeInput(farmId, inputId){
  const qty = parseFloat(document.getElementById('ci_qty').value);
  if(!qty){ showToast('Informe a quantidade'); return; }
  const f = farms[farmId];
  const item = f.inputs.find(x=>x.id===inputId);
  item.stock = Math.max(0, item.stock - qty);
  const talhaoId = document.getElementById('ci_talhao').value;
  const custoTotal = qty * item.costPerUnit;
  const t = talhaoId ? f.talhoes.find(x=>x.id===talhaoId) : null;
  let msg = `Uso registrado: ${qty} ${item.unit} de ${item.name} (R$ ${custoTotal.toFixed(2)})`;
  if(t && t.area>0){ msg += ` — R$ ${(custoTotal/t.area).toFixed(2)}/ha em ${t.name}`; }
  logCost({farmId, farmName:f.name, talhaoId:talhaoId||null, talhaoName:t?t.name:null, category:'Insumo', desc:`${item.name} (${qty} ${item.unit})`, value:custoTotal});
  if(t && item.type==='Defensivos'){
    const dose = (document.getElementById('ci_dose') || {}).value?.trim() || null;
    const carenciaRaw = (document.getElementById('ci_carencia') || {}).value;
    const carenciaDias = carenciaRaw ? parseInt(carenciaRaw) : null;
    const liberadoEm = carenciaDias ? addDaysISO(isoToday(), carenciaDias) : null;
    t.applications = t.applications || [];
    t.applications.unshift({d:isoToday(), produto:item.name, dose, carenciaDias, liberadoEm, responsible:currentViewMember().name});
  }
  renderInputsBody(farmId);
  registerChange(msg);
}

// ---------------------------------------------------------------
// MÁQUINAS E EQUIPAMENTOS — horímetro, combustível, manutenção
// ---------------------------------------------------------------
function openMachinesSheet(farmId){
  renderMachinesBody(farmId);
}
function renderMachinesBody(farmId){
  const f = farms[farmId];
  f.machines = f.machines || [];
  const rows = f.machines.map(m=>{
    const hoursLeft = m.nextMaintenanceHour - m.horimetro;
    const needsMaintenance = hoursLeft <= 20;
    return `<div class="card" style="margin-bottom:8px;">
      <div class="kv-row"><span class="k"><b>${m.name}</b> · ${m.type}</span>${needsMaintenance?'<span class="tag alert">Manutenção próxima</span>':''}</div>
      <div class="kv-row"><span class="k">Horímetro</span><span class="v">${m.horimetro} h</span></div>
      <div class="kv-row"><span class="k">Próxima manutenção</span><span class="v">${m.nextMaintenanceHour} h (faltam ${hoursLeft} h)</span></div>
      <div class="kv-row"><span class="k">Última manutenção</span><span class="v">${fmtDate(m.lastMaintenance)}</span></div>
      <div class="kv-row"><span class="k">Consumo estimado</span><span class="v">${m.fuelPerHour} L/h · R$ ${m.costPerHour.toFixed(2)}/h</span></div>
      <button class="action-btn" style="margin-top:6px;" onclick="openRegisterMachineUse('${f.id}','${m.id}')">Registrar uso</button>
    </div>`;
  }).join('') || '<div class="empty-note">Nenhuma máquina cadastrada.</div>';

  openSheet(`Máquinas e equipamentos — ${f.name}`, `
    ${rows}
    <div class="h-eyebrow" style="padding:8px 0 4px;">Nova máquina</div>
    <div class="form-row2">
      <div class="form-field"><label>Nome</label><input id="nm_name" placeholder="Ex: Trator John Deere 6120"></div>
      <div class="form-field"><label>Tipo</label>${styledSelectHTML('nm_type', ['Trator','Pulverizador','Colheitadeira','Implemento','Outro'].map(v=>({value:v,label:v})), 'Trator')}</div>
    </div>
    <div class="form-row2">
      <div class="form-field"><label>Horímetro atual</label><input id="nm_horim" type="number" placeholder="Ex: 0"></div>
      <div class="form-field"><label>Próxima manutenção (h)</label><input id="nm_nextmaint" type="number" placeholder="Ex: 250"></div>
    </div>
    <div class="form-row2">
      <div class="form-field"><label>Consumo (L/h)</label><input id="nm_fuel" type="number" placeholder="Ex: 14"></div>
      <div class="form-field"><label>Custo operacional (R$/h)</label><input id="nm_cost" type="number" placeholder="Ex: 180"></div>
    </div>
    <button class="sheet-save" onclick="addMachine('${farmId}')">Adicionar máquina</button>
  `);
}
function addMachine(farmId){
  const name = document.getElementById('nm_name').value.trim();
  if(!name){ showToast('Dê um nome para a máquina'); return; }
  const f = farms[farmId];
  f.machines.push({id:newId('mq'), name, type:document.getElementById('nm_type').value,
    horimetro:parseFloat(document.getElementById('nm_horim').value)||0,
    fuelPerHour:parseFloat(document.getElementById('nm_fuel').value)||0,
    costPerHour:parseFloat(document.getElementById('nm_cost').value)||0,
    lastMaintenance:isoToday(), nextMaintenanceHour:parseFloat(document.getElementById('nm_nextmaint').value)||100});
  renderMachinesBody(farmId);
  registerChange(`Máquina "${name}" cadastrada`);
}
function openRegisterMachineUse(farmId, machineId){
  const m = farms[farmId].machines.find(x=>x.id===machineId);
  const f = farms[farmId];
  const talhaoOptions = [{value:'',label:'— Não vincular a um talhão —'}].concat((f.talhoes||[]).map(t=>({value:t.id,label:t.name})));
  openSheet('Registrar uso — ' + m.name, `
    <div class="form-row2">
      <div class="form-field"><label>Horas trabalhadas</label><input id="mu_hours" type="number" placeholder="Ex: 6"></div>
      <div class="form-field"><label>Talhão (opcional)</label>${styledSelectHTML('mu_talhao', talhaoOptions, '')}</div>
    </div>
    <button class="sheet-save" onclick="registerMachineUse('${farmId}','${machineId}')">Registrar uso</button>
  `);
}
function registerMachineUse(farmId, machineId){
  const hours = parseFloat(document.getElementById('mu_hours').value);
  if(!hours){ showToast('Informe as horas trabalhadas'); return; }
  const f = farms[farmId];
  const m = f.machines.find(x=>x.id===machineId);
  m.horimetro += hours;
  const fuel = hours * m.fuelPerHour;
  const custo = hours * m.costPerHour;
  const talhaoId = document.getElementById('mu_talhao').value;
  const t = talhaoId ? f.talhoes.find(x=>x.id===talhaoId) : null;
  let msg = `Uso registrado: ${m.name} · ${hours} h (${fuel.toFixed(0)} L · R$ ${custo.toFixed(2)})`;
  if(t) msg += ` em ${t.name}`;
  if(m.nextMaintenanceHour - m.horimetro <= 20){ msg += ' — atenção: manutenção próxima ⚠️'; }
  logCost({farmId, farmName:f.name, talhaoId:talhaoId||null, talhaoName:t?t.name:null, category:'Máquina', desc:`${m.name} (${hours} h)`, value:custo});
  renderMachinesBody(farmId);
  registerChange(msg);
}

// ---------------------------------------------------------------
// PAINEL DA AGRICULTURA — visão consolidada de todas as propriedades
// ---------------------------------------------------------------
// Resumo compacto da lavoura, embutido direto no topo da aba Agricultura de
// UMA propriedade — mesmo espírito do pecResumoCardHTML, só que pros
// talhões dessa fazenda.
function agroResumoCardHTML(f){
  const talhoes = f.talhoes||[];
  if(!talhoes.length) return '';
  const areaTotal = talhoes.reduce((s,t)=>s+(t.area||0),0);
  const emPlantio = talhoes.filter(t=>t.operationType==='Plantio').length;
  const emColheita = talhoes.filter(t=>t.operationType==='Colheita').length;
  const proxColheita = talhoes.filter(t=>t.previsaoColheita && daysFromToday(t.previsaoColheita)!=null && daysFromToday(t.previsaoColheita)>=0 && daysFromToday(t.previsaoColheita)<=15).length;
  const culturaAreas = {};
  talhoes.forEach(t=>{ if(t.cultura && t.cultura!=='—'){ culturaAreas[t.cultura] = (culturaAreas[t.cultura]||0)+(t.area||0); } });
  const culturaRows = Object.keys(culturaAreas).map(c=>`<div class="kv-row"><span class="k">${c}</span><span class="v">${culturaAreas[c].toFixed(0)} ha</span></div>`).join('');
  return `<div class="card" style="margin:10px 16px 14px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div class="h-eyebrow" style="margin:0;padding:0;">Resumo da lavoura</div>
      <a href="javascript:void(0)" onclick="openAgriculturaPanel('${f.id}')" style="font-size:10.5px;font-weight:700;color:var(--brand-dark);text-decoration:none;">Painel completo ›</a>
    </div>
    <div class="stat-grid">
      ${statTile('map-pin','bg-brand', areaTotal.toFixed(0)+' ha', 'Área total')}
      ${statTile('sprout','bg-brand', emPlantio, 'Em plantio')}
      ${statTile('wheat','bg-warning', emColheita, 'Em colheita')}
      ${statTile('alarm','bg-sky', proxColheita, 'Colheita em 15 dias')}
    </div>
    ${culturaRows ? `<div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border);">${culturaRows}</div>` : ''}
  </div>`;
}
let agroPanelFilter = '';
function openAgriculturaPanel(farmId){
  if(farmId!==undefined) agroPanelFilter = farmId;
  const filter = agroPanelFilter;
  const farmsAgro = filter ? [farms[filter]] : allFarmsWithAgro();
  const allTalhoes = farmsAgro.flatMap(f=>(f.talhoes||[]).map(t=>({...t, _farmId:f.id, _farmName:f.name})));
  const areaTotal = allTalhoes.reduce((s,t)=>s+(t.area||0),0);
  const areaPlantada = allTalhoes.filter(t=>t.operationType && t.operationType!=='Colheita' || t.dataPlantio).reduce((s,t)=>s+(t.area||0),0);
  const emPlantio = allTalhoes.filter(t=>t.operationType==='Plantio').length;
  const emDesenvolvimento = allTalhoes.filter(t=>!t.operationType || (t.operationType!=='Plantio' && t.operationType!=='Colheita')).length;
  const emColheita = allTalhoes.filter(t=>t.operationType==='Colheita').length;
  const proxColheita = allTalhoes.filter(t=>t.previsaoColheita && daysFromToday(t.previsaoColheita)!=null && daysFromToday(t.previsaoColheita)>=0 && daysFromToday(t.previsaoColheita)<=15);
  const favoraveis = allTalhoes.filter(t=>t.status==='favoravel').length;
  const atencao = allTalhoes.filter(t=>t.status==='atencao').length;
  const desfavoraveis = allTalhoes.filter(t=>t.status==='desfavoravel').length;
  const alertas = farmsAgro.flatMap(f=>(f.weather&&f.weather.alerts)||[]);
  const criticalInputs = farmsAgro.flatMap(f=>(f.inputs||[]).filter(i=>i.stock<=i.minStock).map(i=>({...i,_farmName:f.name})));
  const upcomingActs = activities.filter(a=>a.type==='agro' && (a.bucket==='hoje'||a.bucket==='proximas') && (!filter||a.farm===filter)).length;
  const produzido = allTalhoes.filter(t=>t.actualYield!=null);
  const culturaAreas = {};
  allTalhoes.forEach(t=>{ if(t.cultura && t.cultura!=='—'){ culturaAreas[t.cultura] = (culturaAreas[t.cultura]||0)+(t.area||0); } });

  const talhaoRows = allTalhoes.map(t=>`<div class="talhao-card" onclick="closeSheet(); openProperty('${t._farmId}'); pdActiveTab='agro'; setTimeout(()=>openCondition('${t._farmId}','${t.id}'),50);">
      <div class="talhao-top">
        <span class="talhao-name">${t.name}</span>
        <span class="status-chip ${t.status}"><span class="sic">${emojiIcon(statusMeta[t.status].icon,{size:12})}</span>${statusMeta[t.status].label}</span>
      </div>
      <div class="talhao-meta">${t._farmName} · ${t.area} ha · ${t.variedade||'—'}</div>
    </div>`).join('') || '<div class="empty-note">Nenhum talhão cadastrado</div>';

  const farmOptions = [{value:'',label:'Todas as propriedades'}].concat(allFarmsWithAgro().map(f=>({value:f.id,label:f.name})));
  const climaRows = farmsAgro.map(f=>{
    const w = f.weather||{};
    return `<div class="kv-stack" style="cursor:pointer;" onclick="closeSheet(); openProperty('${f.id}');">
      <span class="k">${w.icon||'❔'} ${f.name}</span>
      <span class="v">${w.temp!=null?w.temp+'°C':'—'} · ${w.cond||'sem dados'}${w.rain!=null?' · '+w.rain+'% chuva':''}</span>
    </div>`;
  }).join('') || '<div class="kv-row"><span class="k">Nenhuma propriedade com Agricultura</span></div>';

  openSheet('Painel da Agricultura', `
    <div class="form-field" style="margin-bottom:10px;">${styledSelectHTML('agro_farm_filter', farmOptions, filter, {onChange:'openAgriculturaPanel'})}</div>
    <div class="h-eyebrow" style="padding:0 0 6px;">Clima nas propriedades</div>
    <div class="card">${climaRows}</div>
    <div class="stat-grid" style="margin:10px 0;">
      <div class="stat-tile"><div class="stat-num">${areaTotal.toFixed(0)} ha</div><div class="stat-lbl">Área total monitorada</div></div>
      <div class="stat-tile"><div class="stat-num">${areaPlantada.toFixed(0)} ha</div><div class="stat-lbl">Área plantada/em produção</div></div>
      <div class="stat-tile"><div class="stat-num">${emPlantio}</div><div class="stat-lbl">Talhões em plantio</div></div>
      <div class="stat-tile"><div class="stat-num">${emDesenvolvimento}</div><div class="stat-lbl">Em desenvolvimento</div></div>
      <div class="stat-tile"><div class="stat-num">${emColheita}</div><div class="stat-lbl">Talhões em colheita</div></div>
      <div class="stat-tile"><div class="stat-num">${proxColheita.length}</div><div class="stat-lbl">Próximos da colheita (15 dias)</div></div>
      <div class="stat-tile"><div class="stat-num">${alertas.length}</div><div class="stat-lbl">Alertas climáticos ativos</div></div>
      <div class="stat-tile"><div class="stat-num">${criticalInputs.length}</div><div class="stat-lbl">Insumos em estoque crítico</div></div>
    </div>
    <div class="h-eyebrow" style="padding:0 0 6px;">Condição operacional do dia</div>
    <div class="card">
      <div class="kv-row"><span class="k">✅ Favorável</span><span class="v">${favoraveis} talhão(ões)</span></div>
      <div class="kv-row"><span class="k">⚠️ Atenção</span><span class="v">${atencao} talhão(ões)</span></div>
      <div class="kv-row"><span class="k">⛔ Desfavorável</span><span class="v">${desfavoraveis} talhão(ões)</span></div>
    </div>
    ${Object.keys(culturaAreas).length ? `<div class="h-eyebrow" style="padding:10px 0 6px;">Culturas por hectare</div>
    <div class="card">${Object.keys(culturaAreas).map(c=>`<div class="kv-row"><span class="k">${c}</span><span class="v">${culturaAreas[c].toFixed(0)} ha</span></div>`).join('')}</div>` : ''}
    <div class="h-eyebrow" style="padding:10px 0 6px;">Produção estimada e realizada</div>
    <div class="card"><div class="kv-row"><span class="k">Talhões com colheita registrada</span><span class="v">${produzido.length} de ${allTalhoes.filter(t=>t.operationType==='Colheita'||t.previsaoColheita).length||0}</span></div>
    ${produzido.map(t=>`<div class="kv-row"><span class="k">${t.name}</span><span class="v">${t.actualYield} sc/ha</span></div>`).join('')}</div>
    <div class="h-eyebrow" style="padding:10px 0 6px;">Atividades agrícolas próximas</div>
    <div class="card"><div class="kv-row"><span class="k">Hoje ou nos próximos dias</span><span class="v">${upcomingActs}</span></div></div>
    <div class="h-eyebrow" style="padding:10px 0 6px;">Talhões monitorados</div>
    ${talhaoRows}
  `);
}

// ---------------------------------------------------------------
// RENDER: ANIMAL PROFILE
// ---------------------------------------------------------------
let animalTab = 'geral';
function openAnimal(farmId, animalId){
  const f = farms[farmId];
  const a = f.animals.find(x=>x.id===animalId);
  window._currentAnimal = {farmId, animalId};
  animalTab = 'geral';
  document.getElementById('animalName').textContent = `${a.brinco}${a.name!=='—'?' · '+a.name:''}`;
  document.getElementById('animalSub').textContent = `${f.name} · ${a.lot}`;
  renderAnimalTabs();
  pushScreen('screen-animal');
}
function renderAnimalTabs(){
  const {farmId, animalId} = window._currentAnimal;
  const f = farms[farmId];
  const a = f.animals.find(x=>x.id===animalId);
  const tabs = ['geral','producao','reproducao','saude','historico'];
  const labels = {geral:'Geral',producao:'Produção',reproducao:'Reprodução',saude:'Saúde',historico:'Histórico'};
  const el = document.getElementById('animalContent');
  const overdueCount = animalHealthTasks(a).filter(t=>t.days!=null && t.days<0).length;
  const profileBadge = animalStatusBadge(a);
  el.innerHTML = `
    <div class="card" style="display:flex;gap:12px;align-items:center;margin-top:12px;">
      <div class="animal-photo" style="width:56px;height:56px;font-size:24px;">${emojiIcon(a.photo,{size:28})}</div>
      <div style="flex:1;">
        <div class="talhao-name">${a.species&&a.species!=='bovino'?(SPECIES_LABELS[a.species]||a.species)+' · ':''}${a.breed} · ${a.sex} · ${a.category||'—'}</div>
        <div class="talhao-meta">Nasc. ${a.birth?fmtDate(a.birth):'—'}${a.birth&&ageLabel(a.birth)?' · '+ageLabel(a.birth):''} · ${a.weight?a.weight+' kg':'—'}</div>
        <div style="margin-top:5px;"><span class="tag ${profileBadge.cls}">${profileBadge.label}</span></div>
      </div>
      ${overdueCount ? `<span class="tag alert">${overdueCount} pendência(s)</span>` : ''}
    </div>
    <div class="tabs-row">${tabs.map(t=>`<button class="tab-btn ${t===animalTab?'active':''}" data-atab="${t}">${labels[t]}</button>`).join('')}</div>
    <div id="animalTabBody"></div>
    <div class="action-row">
      <button class="action-btn primary" style="flex:none;padding:9px 18px;" onclick="openRegisterAnimalActivity('${farmId}','${animalId}')">＋ Registrar atividade</button>
      <button class="action-btn" style="flex:none;padding:9px 18px;" onclick="openAnimalQR('${farmId}','${animalId}')">🔳 QR do animal</button>
    </div>
  `;
  document.querySelectorAll('#animalContent .tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{ animalTab = btn.dataset.atab; renderAnimalTabs(); });
  });
  const body = document.getElementById('animalTabBody');
  if(animalTab==='geral'){
    const pasture = (f.pastures||[]).find(p=>p.id===a.pastureId);
    body.innerHTML = `<div class="card">
      <div class="kv-row"><span class="k">Brinco</span><span class="v">${a.brinco}</span></div>
      <div class="kv-row"><span class="k">Identificação eletrônica</span><span class="v">${a.eletronicId||'—'}</span></div>
      <div class="kv-row"><span class="k">Peso atual</span><span class="v">${a.weight?a.weight+' kg':'—'}${a.targetWeight?' (meta '+a.targetWeight+' kg)':''}</span></div>
      <div class="kv-row"><span class="k">Situação</span><span class="v">${a.situation}</span></div>
      <div class="kv-row"><span class="k">Situação no plantel</span><span class="v">${a.statusPlantel||'Ativo'}</span></div>
      <div class="kv-row"><span class="k">Finalidade</span><span class="v">${a.purpose||'—'}</span></div>
      <div class="kv-row"><span class="k">Pai / Mãe</span><span class="v">${a.father||'—'} / ${a.mother||'—'}</span></div>
      <div class="kv-row"><span class="k">Lote</span><span class="v">${a.lot}</span></div>
      <div class="kv-row"><span class="k">Pasto atual</span><span class="v">${pasture?pasture.name:'—'}</span></div>
      <div class="kv-row"><span class="k">Próxima vacina</span><span class="v">${a.nextVaccine?fmtDate(a.nextVaccine):'—'}</span></div>
    </div>`;
  } else if(animalTab==='producao'){
    const milk = animalMilkEntries(a);
    if(a.sex!=='Fêmea' || !milk.length){
      body.innerHTML = `<div class="empty-note">Sem registros de produção para este animal.</div>`;
    } else {
      const last = milk[milk.length-1], prev = milk.length>1 ? milk[milk.length-2] : null;
      const delta = prev ? (((last.meta.liters-prev.meta.liters)/prev.meta.liters)*100) : null;
      const avg = milk.reduce((s,m)=>s+m.meta.liters,0)/milk.length;
      body.innerHTML = `
        <div class="stat-grid" style="margin-bottom:10px;">
          <div class="stat-tile"><div class="stat-num">${last.meta.liters} L</div><div class="stat-lbl">Produção atual/dia</div></div>
          <div class="stat-tile"><div class="stat-num">${avg.toFixed(1)} L</div><div class="stat-lbl">Média do período</div></div>
        </div>
        <div class="card">
          <div class="kv-row"><span class="k">Situação de lactação</span><span class="v">${a.milkStatus||'—'}</span></div>
          ${delta!=null ? `<div class="kv-row"><span class="k">Variação vs. pesagem anterior</span><span class="v" style="color:${delta<-10?'var(--critical)':delta<0?'#9a6a00':'var(--good)'};">${delta>=0?'+':''}${delta.toFixed(1)}%</span></div>` : ''}
        </div>
        ${delta!=null && delta<-10 ? '<div class="empty-note">⚠ Queda de produção acima de 10% — vale investigar alimentação, sanidade ou estresse.</div>' : ''}
        <div class="h-eyebrow" style="padding:8px 0 4px;">Histórico de lactação</div>
        <div class="card">${milk.slice().reverse().map(m=>`<div class="kv-row"><span class="k">${fmtDate(m.d)}</span><span class="v">${m.meta.liters} L/dia</span></div>`).join('')}</div>
      `;
    }
  } else if(animalTab==='reproducao'){
    const reproTypes = ['Cio','Cobertura/IA','Diagnóstico de gestação','Parto','Desmama'];
    const events = (a.history||[]).filter(h=>reproTypes.includes(h.t)).slice().sort((x,y)=>parseISO(y.d)-parseISO(x.d));
    const lastDiag = events.find(e=>e.t==='Diagnóstico de gestação' && e.meta && e.meta.result==='Positivo');
    const dueDays = lastDiag && lastDiag.meta.dueDate ? daysFromToday(lastDiag.meta.dueDate) : null;
    const weanDays = a.weanTarget ? daysFromToday(a.weanTarget) : null;
    body.innerHTML = `
      <div class="card">
        <div class="kv-row"><span class="k">Situação reprodutiva</span><span class="v">${a.situation}</span></div>
        ${lastDiag && lastDiag.meta.dueDate ? `<div class="kv-row"><span class="k">Previsão de parto</span><span class="v">${fmtDate(lastDiag.meta.dueDate)}${dueDays!=null?' ('+(dueDays>=0?'em '+dueDays+' dias':'atrasado '+Math.abs(dueDays)+' dias')+')':''}</span></div>` : ''}
        ${a.weanedAt ? `<div class="kv-row"><span class="k">Desmama efetiva</span><span class="v">${fmtDate(a.weanedAt)}</span></div>` : (a.weanTarget ? `<div class="kv-row"><span class="k">Desmama prevista</span><span class="v">${fmtDate(a.weanTarget)}${weanDays!=null?' ('+(weanDays>=0?'em '+weanDays+' dias':'atrasada '+Math.abs(weanDays)+' dias')+')':''}</span></div>` : '')}
      </div>
      ${dueDays!=null && dueDays>=0 && dueDays<=15 ? '<div class="empty-note">🐣 Parto próximo — fique atento aos sinais nos próximos dias.</div>' : ''}
      ${weanDays!=null && weanDays<0 ? '<div class="empty-note">⚠ Desmama atrasada — considere registrar a desmama deste animal.</div>' : ''}
      <div class="h-eyebrow" style="padding:8px 0 4px;">Histórico reprodutivo</div>
      <div class="card">${events.length ? events.map(e=>`<div class="kv-row"><span class="k">${fmtDate(e.d)} — ${e.t}</span><span class="v">${e.v}</span></div>`).join('') : '<div class="kv-row"><span class="k">Sem eventos reprodutivos registrados</span></div>'}</div>
    `;
  } else if(animalTab==='saude'){
    const tasks = animalHealthTasks(a);
    const withdrawal = animalWithdrawalActive(a);
    const healthEvents = (a.history||[]).filter(h=>['Vacina','Vermífugo','Medicamento','Doença/Tratamento'].includes(h.t)).slice().sort((x,y)=>parseISO(y.d)-parseISO(x.d));
    body.innerHTML = `
      <div class="h-eyebrow" style="padding:0 0 4px;">Tarefas pendentes</div>
      ${tasks.length ? tasks.map(t=>{
        const overdue = t.days!=null && t.days<0;
        return `<div class="talhao-card">
          <div class="talhao-top"><span class="talhao-name">${t.type}</span><span class="status-chip ${overdue?'desfavoravel':'atencao'}">${overdue?'Atrasada':'Em '+t.days+' dia(s)'}</span></div>
          <div class="talhao-meta">Vencimento ${fmtDate(t.due)}</div>
        </div>`;}).join('') : '<div class="empty-note">Nenhuma tarefa de sanidade pendente.</div>'}
      ${withdrawal ? `<div class="empty-note">⛔ Em carência até ${fmtDate(withdrawal)} — não vender/abater antes dessa data.</div>` : ''}
      <div class="h-eyebrow" style="padding:8px 0 4px;">Histórico sanitário</div>
      <div class="card">${healthEvents.length ? healthEvents.map(h=>`<div class="kv-row"><span class="k">${fmtDate(h.d)} — ${h.t}</span><span class="v">${h.v}</span></div>`).join('') : '<div class="kv-row"><span class="k">Sem registros sanitários</span></div>'}</div>
    `;
  } else if(animalTab==='historico'){
    const totalCusto = (a.history||[]).filter(h=>h.t==='Custo' && h.meta && h.meta.valor).reduce((s,h)=>s+h.meta.valor,0);
    body.innerHTML = `
      ${totalCusto>0 ? `<div class="card"><div class="kv-row"><span class="k">Custo total registrado</span><span class="v">R$ ${totalCusto.toFixed(2)}</span></div></div>` : ''}
      <div class="card">${a.history.map(h=>`<div class="kv-row"><span class="k">${fmtDate(h.d)} — ${h.t}</span><span class="v">${h.v}</span></div>`).join('')}</div>
    `;
  }
}

// ---------------------------------------------------------------
// RENDER: ACTIVITIES
// ---------------------------------------------------------------
// Para atividades ligadas a um talhão, a classificação de condição (favorável/atenção/
// desfavorável) tem que refletir o status AO VIVO do talhão (recalculado quando o clima
// real chega via recomputeTalhaoConditions) — não o valor estático gravado na atividade
// na criação, senão o rótulo fica desatualizado e contradiz o motivo/tela de condição.
function activityLinkedTalhao(a){
  if(!a.talhaoId) return null;
  const f = farms[a.farm];
  return (f.talhoes||[]).find(x=>x.id===a.talhaoId) || null;
}
function activityEffectiveStatus(a){
  const t = activityLinkedTalhao(a);
  if(t && a.status && a.status!=='concluida') return t.status;
  return a.status;
}
function activityItemHTML(a){
  const overdue = a.bucket==='atrasadas';
  const effectiveStatus = activityEffectiveStatus(a);
  return `<div class="activity-item" onclick="openActivity('${a.id}')">
    <div class="act-icon">${emojiIcon(a.icon,{size:18})}</div>
    <div class="act-body">
      <div class="act-title">${a.title}</div>
      <div class="act-sub">${farms[a.farm].name} · ${a.responsible}</div>
    </div>
    <div class="act-right">
      <span class="act-date ${overdue?'overdue':''}">${a.when}</span>
      ${effectiveStatus?`<span class="status-chip sm ${effectiveStatus}">${statusMeta[effectiveStatus].label}</span>`:''}
    </div>
  </div>`;
}
let actFilter = 'todas';
function renderActivitiesFilters(){
  const filters = [
    {id:'todas', label:'Todas'},
    {id:'atrasadas', label:'Atrasadas'},
    {id:'hoje', label:'Hoje'},
    {id:'proximas', label:'Próximas'},
    {id:'concluidas', label:'Concluídas'},
  ];
  document.getElementById('actFilters').innerHTML = filters.map(f=>
    `<button class="chip-btn ${f.id===actFilter?'active':''}" data-af="${f.id}">${f.label}</button>`).join('');
  document.querySelectorAll('#actFilters .chip-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{ actFilter = btn.dataset.af; renderActivitiesFilters(); renderActivitiesList(); });
  });
}
function renderActivitiesList(){
  const list = actFilter==='todas' ? activities : activities.filter(a=>a.bucket===actFilter);
  document.getElementById('activitiesList').innerHTML = list.map(activityItemHTML).join('') || '<div class="empty-note">Nenhuma atividade nesta categoria.</div>';
}
function openActivity(id){
  const a = activities.find(x=>x.id===id);
  const f = farms[a.farm];
  const t = activityLinkedTalhao(a);
  const isLiveClassification = t && a.status && a.status!=='concluida';
  const effectiveStatus = activityEffectiveStatus(a);
  document.getElementById('actDetailSub').textContent = `${f.name}`;
  document.getElementById('actDetailContent').innerHTML = `
    <div class="card" style="margin-top:12px;">
      <div class="kv-row"><span class="k">Atividade</span><span class="v">${a.title}</span></div>
      <div class="kv-row"><span class="k">Propriedade</span><span class="v">${f.name}</span></div>
      <div class="kv-row"><span class="k">Quando</span><span class="v">${a.when}</span></div>
      <div class="kv-row"><span class="k">Responsável</span><span class="v">${a.responsible}</span></div>
      ${effectiveStatus?`<div class="kv-row" ${t?`style="cursor:pointer;" onclick="openCondition('${a.farm}','${a.talhaoId}')"`:''}>
        <span class="k">Classificação</span>
        <span class="v"><span class="status-chip ${effectiveStatus}">${statusMeta[effectiveStatus].label}</span>${t?' <span class="chev">›</span>':''}</span>
      </div>`:''}
      ${t && t.reason && isLiveClassification ? `<div style="font-size:11px;color:var(--ink-2);line-height:1.45;padding:6px 0 2px;border-top:1px dashed var(--border);margin-top:2px;">
        <b>Por que:</b> ${t.reason}${t.nextWindow?` <span style="color:var(--ink-muted);">Próxima janela: ${t.nextWindow}.</span>`:''}
        <div style="margin-top:4px;"><span style="color:var(--brand-dark);font-weight:700;cursor:pointer;" onclick="openCondition('${a.farm}','${a.talhaoId}')">Ver condição completa do talhão ›</span></div>
      </div>` : ''}
    </div>
    <div class="h-eyebrow section-pad">Ações</div>
    <div class="action-row">
      <button class="action-btn" onclick="openReagendarAtividade('${a.id}')">Reagendar</button>
      <button class="action-btn" onclick="openJustificarAtividade('${a.id}')">Justificar</button>
      <button class="action-btn primary" onclick="concluirAtividade('${a.id}')">Concluir</button>
    </div>
    <div class="h-eyebrow section-pad">Histórico de alterações</div>
    <div class="card" id="actLog${a.id}"><div class="kv-row"><span class="k">Criada por ${a.responsible}</span><span class="v">12 ago</span></div>${(a.log||[]).map(l=>`<div class="kv-row"><span class="k">${l}</span></div>`).join('')}</div>
  `;
  pushScreen('screen-activity-detail');
}

// ---------------------------------------------------------------
// RENDER: NOTIFICATIONS
// ---------------------------------------------------------------
let notifFilter = 'todas';
const PRIORITY_COLOR = {Alta:'desfavoravel', Média:'atencao', Baixa:'favoravel'};
const PRIORITY_BADGE = {Alta:'pri-alta', Média:'pri-media', Baixa:'pri-baixa'};
function renderNotifFilters(){
  const el = document.getElementById('notifFilters');
  if(!el) return;
  const cats = ['todas', ...NOTIF_CATEGORIES];
  el.innerHTML = cats.map(c=>
    `<button class="chip-btn ${c===notifFilter?'active':''}" data-nf="${c}">${c==='todas'?'Todas':c}</button>`).join('');
  el.querySelectorAll('.chip-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{ notifFilter = btn.dataset.nf; renderNotifFilters(); renderNotifications(); });
  });
}
function renderNotifications(){
  renderNotifFilters();
  // Notificações marcadas como lidas saem da Central assim que confirmadas — "Lida"
  // funciona como "concluir/dispensar", não só um marcador visual que permanece na lista.
  const unread = notifications.filter(n=>!n.read);
  const list = notifFilter==='todas' ? unread : unread.filter(n=>n.category===notifFilter);
  document.getElementById('notifList').innerHTML = list.length ? list.map(n=>`
    <div class="notif-item ${PRIORITY_BADGE[n.priority]||''}" data-id="${n.id}">
      <div class="notif-ic ${PRIORITY_BADGE[n.priority]||''}">${emojiIcon(n.icon,{size:18})}</div>
      <div style="flex:1;min-width:0;" onclick='handleNotifClick(${JSON.stringify(n.target)})'>
        <div class="notif-top-row">
          <div class="notif-title">${n.title}</div>
          <button class="notif-read-btn" onclick="event.stopPropagation();markNotifRead('${n.id}')">Lida</button>
        </div>
        <div class="notif-body">${n.body}</div>
        <div class="notif-farmline">${farms[n.farm].name} · ${n.time}${n.category?' · '+n.category:''}</div>
        <div class="notif-bottom-row">
          ${n.priority?`<span class="status-chip ${PRIORITY_COLOR[n.priority]||'dados'}">Prioridade ${n.priority}</span>`:'<span></span>'}
          <span class="notif-action">Abrir ›</span>
        </div>
      </div>
    </div>`).join('') : '<div class="empty-note">Nenhuma notificação pendente nesta categoria.</div>';
  updateBellBadge();
}
function markNotifRead(id){
  const n = notifications.find(x=>x.id===id);
  if(n){ n.read = true; }
  // Anima o card saindo antes de tirá-lo da lista, para ficar claro que a ação
  // funcionou (em vez de só sumir seco/instantâneo).
  const card = document.querySelector(`#notifList .notif-item[data-id="${id}"]`);
  if(card){
    card.classList.add('dismissing');
    setTimeout(renderNotifications, 260);
  } else {
    renderNotifications();
  }
  showToast('Notificação marcada como lida');
}
function updateBellBadge(){
  const unread = notifications.filter(n=>!n.read).length;
  // querySelectorAll (não só o primeiro) porque no modo desktop existe um
  // segundo sininho, na barra superior — os dois têm que mostrar o mesmo número.
  document.querySelectorAll('.bell .badge').forEach(badge=>{
    if(unread>0){ badge.style.display='flex'; badge.textContent = unread; }
    else { badge.style.display='none'; }
  });
  const homeSub = document.querySelector('#screen-home .app-header .sub');
  if(homeSub){ homeSub.textContent = `${Object.keys(farms).length} propriedades · ${unread} alerta${unread!==1?'s':''} ativo${unread!==1?'s':''}`; }
}
function handleNotifClick(target){
  backStack=['screen-home'];
  if(target.screen==='condition'){ openCondition(target.farm, target.talhao); }
  else if(target.screen==='activities'){ goTab('screen-activities'); }
  else if(target.screen==='animal'){ openAnimal(target.farm, target.animal); }
}

// ---------------------------------------------------------------
// RENDER: REPORTS (charts follow dataviz mark specs: thin bars,
// rounded 4px ends, fixed categorical order, legend, no dual axis)
// ---------------------------------------------------------------
const CAT = ['#2a78d6','#eb6834','#1baf7a','#eda100']; // categorical slots 1-4 (validated order)
function renderReports(){
  const areaData = Object.values(farms).map(f=>({label:f.name.replace('Fazenda ','').replace('Sítio ',''), value: parseInt(f.area)}));
  const maxArea = Math.max(...areaData.map(d=>d.value));

  // Talhões por estágio — agregado real de todos os talhões de todas as fazendas
  const stageAgg = {};
  allFarmsWithAgro().forEach(f=>(f.talhoes||[]).forEach(t=>{ const k=t.stage||'—'; stageAgg[k]=(stageAgg[k]||0)+(t.area||0); }));
  const stageData = Object.keys(stageAgg).map((k,i)=>({label:k, value:stageAgg[k], color:CAT[i%CAT.length]}));
  const stageTotal = stageData.reduce((s,d)=>s+d.value,0) || 1;

  // Animais por categoria — agregado real via categoryCounts()
  const cats = categoryCounts();
  const catLabels = {Vaca:'Vacas', Touro:'Touros', Bezerro:'Bezerros', Bezerra:'Bezerras', Novilha:'Novilhas', Novilho:'Novilhos', Boi:'Bois'};
  const animalCat = Object.keys(cats).map((k,i)=>({label:catLabels[k]||k, value:cats[k], color:CAT[i%CAT.length]}));
  const maxAnimal = Math.max(1, ...animalCat.map(d=>d.value));

  // Sanidade e reprodução — agregado real (mesma lógica do Painel da Pecuária)
  const vacinacaoCount = allAnimalsFlat().filter(a=>animalHealthTasks(a).some(t=>t.days!=null && t.days>=0 && t.days<=30)).length;
  const vacinacaoAtrasada = allAnimalsFlat().filter(a=>animalHealthTasks(a).some(t=>t.days!=null && t.days<0)).length;
  const partosCount = allAnimalsFlat().filter(a=>{
    const diag = (a.history||[]).find(h=>h.t==='Diagnóstico de gestação' && h.meta && h.meta.dueDate);
    return diag && daysFromToday(diag.meta.dueDate)!=null && daysFromToday(diag.meta.dueDate)>=0 && daysFromToday(diag.meta.dueDate)<=30;
  }).length;
  const milkTotal = allAnimalsFlat().filter(a=>a.milkStatus==='Lactante').reduce((s,a)=>s+(a.production||0),0);

  // Custos — agregado real do costLedger, por fazenda e por categoria
  const costByFarm = {};
  costLedger.forEach(c=>{ costByFarm[c.farmName] = (costByFarm[c.farmName]||0)+c.value; });
  const costFarmData = Object.keys(costByFarm).map((k,i)=>({label:k.replace('Fazenda ','').replace('Sítio ',''), value:costByFarm[k], color:CAT[i%CAT.length]}));
  const maxCostFarm = Math.max(1, ...costFarmData.map(d=>d.value));
  const costByCat = {};
  costLedger.forEach(c=>{ costByCat[c.category] = (costByCat[c.category]||0)+c.value; });
  const costCatData = Object.keys(costByCat).map((k,i)=>({label:k, value:costByCat[k], color:CAT[i%CAT.length]}));
  const costCatTotal = costCatData.reduce((s,d)=>s+d.value,0) || 1;
  const totalCost = costLedger.reduce((s,c)=>s+c.value,0);
  // Custos por talhão e por lote/animal — recorte detalhado (rastreabilidade completa do ledger)
  const costByTalhao = {};
  costLedger.filter(c=>c.talhaoName).forEach(c=>{ costByTalhao[c.talhaoName] = (costByTalhao[c.talhaoName]||0)+c.value; });
  const costTalhaoData = Object.keys(costByTalhao).map((k,i)=>({label:k, value:costByTalhao[k], color:CAT[i%CAT.length]}));
  const maxCostTalhao = Math.max(1, ...costTalhaoData.map(d=>d.value));
  const costByLoteAnimal = {};
  costLedger.filter(c=>c.loteName || c.animalName).forEach(c=>{
    const k = c.animalName ? `${c.animalName} (animal)` : `${c.loteName} (lote)`;
    costByLoteAnimal[k] = (costByLoteAnimal[k]||0)+c.value;
  });
  const costLoteAnimalData = Object.keys(costByLoteAnimal).map((k,i)=>({label:k, value:costByLoteAnimal[k], color:CAT[i%CAT.length]}));
  const maxCostLoteAnimal = Math.max(1, ...costLoteAnimalData.map(d=>d.value));

  // Estoque crítico — insumos e alimentação abaixo do mínimo, em todas as fazendas
  const criticalStock = [];
  Object.values(farms).forEach(f=>{
    (f.inputs||[]).forEach(i=>{ if(i.stock<=i.minStock) criticalStock.push({farm:f.name, name:i.name, stock:`${i.stock} ${i.unit}`, min:`${i.minStock} ${i.unit}`}); });
    (f.feed||[]).forEach(i=>{ if(i.stock<=i.minStock) criticalStock.push({farm:f.name, name:i.name, stock:`${i.stock} ${i.unit}`, min:`${i.minStock} ${i.unit}`}); });
  });

  // Atividades realizadas x pendentes
  const concluidas = activities.filter(a=>a.bucket==='concluidas').length;
  const pendentes = activities.filter(a=>a.bucket!=='concluidas').length;
  const atrasadas = activities.filter(a=>a.bucket==='atrasadas').length;

  document.getElementById('reportsContent').innerHTML = `
    <div class="chart-card">
      <div class="chart-title">Área por propriedade</div>
      <div class="chart-sub">Hectares cadastrados, por fazenda</div>
      ${areaData.map(d=>`
        <div class="bar-row">
          <span class="bar-label">${d.label}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(d.value/maxArea*100).toFixed(0)}%;background:${CAT[0]}"></span></span>
          <span class="bar-val">${d.value} ha</span>
        </div>`).join('')}
    </div>

    ${stageData.length ? `<div class="chart-card">
      <div class="chart-title">Talhões por estágio</div>
      <div class="chart-sub">Área (ha) em todas as fazendas com Agricultura, por estágio da cultura</div>
      <div class="stack-track">
        ${stageData.map(d=>`<span class="stack-seg" style="width:${(d.value/stageTotal*100).toFixed(1)}%;background:${d.color};margin-right:2px;"></span>`).join('')}
      </div>
      <div class="legend-row">
        ${stageData.map(d=>`<span class="legend-item"><span class="legend-dot" style="background:${d.color}"></span>${d.label} (${d.value} ha)</span>`).join('')}
      </div>
    </div>` : ''}

    ${animalCat.length ? `<div class="chart-card">
      <div class="chart-title">Animais por categoria</div>
      <div class="chart-sub">Rebanho ativo em todas as fazendas com Pecuária</div>
      ${animalCat.map(d=>`
        <div class="bar-row">
          <span class="bar-label">${d.label}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(d.value/maxAnimal*100).toFixed(0)}%;background:${d.color}"></span></span>
          <span class="bar-val">${d.value}</span>
        </div>`).join('')}
    </div>` : ''}

    ${animalCat.length ? `<div class="chart-card">
      <div class="chart-title">Sanidade e reprodução</div>
      <div class="chart-sub">Resumo dos próximos 30 dias</div>
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-num">${vacinacaoCount}</div><div class="stat-lbl">Vacinações pendentes</div></div>
        <div class="stat-tile"><div class="stat-num">${partosCount}</div><div class="stat-lbl">Partos previstos (30 dias)</div></div>
        <div class="stat-tile"><div class="stat-num">${milkTotal} L</div><div class="stat-lbl">Produção leiteira/dia</div></div>
        <div class="stat-tile"><div class="stat-num">${vacinacaoAtrasada}</div><div class="stat-lbl">Vacinação atrasada</div></div>
      </div>
    </div>` : ''}

    <div class="chart-card">
      <div class="chart-title">Custos por fazenda</div>
      <div class="chart-sub">Insumos, máquinas e alimentação registrados · total R$ ${totalCost.toFixed(2)}</div>
      ${costFarmData.length ? costFarmData.map(d=>`
        <div class="bar-row">
          <span class="bar-label">${d.label}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(d.value/maxCostFarm*100).toFixed(0)}%;background:${d.color}"></span></span>
          <span class="bar-val">R$ ${d.value.toFixed(0)}</span>
        </div>`).join('') : '<div class="empty-note">Nenhum custo registrado ainda.</div>'}
    </div>

    ${costCatData.length ? `<div class="chart-card">
      <div class="chart-title">Custos por categoria</div>
      <div class="chart-sub">Distribuição entre insumos, máquinas e alimentação</div>
      <div class="stack-track">
        ${costCatData.map(d=>`<span class="stack-seg" style="width:${(d.value/costCatTotal*100).toFixed(1)}%;background:${d.color};margin-right:2px;"></span>`).join('')}
      </div>
      <div class="legend-row">
        ${costCatData.map(d=>`<span class="legend-item"><span class="legend-dot" style="background:${d.color}"></span>${d.label} (R$ ${d.value.toFixed(0)})</span>`).join('')}
      </div>
    </div>` : ''}

    <div class="chart-card">
      <div class="chart-title">Custos por talhão</div>
      <div class="chart-sub">Insumos e máquinas vinculados a um talhão específico</div>
      ${costTalhaoData.length ? costTalhaoData.map(d=>`
        <div class="bar-row">
          <span class="bar-label">${d.label}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(d.value/maxCostTalhao*100).toFixed(0)}%;background:${d.color}"></span></span>
          <span class="bar-val">R$ ${d.value.toFixed(0)}</span>
        </div>`).join('') : '<div class="empty-note">Nenhum custo vinculado a talhão ainda.</div>'}
    </div>

    <div class="chart-card">
      <div class="chart-title">Custos por lote ou animal</div>
      <div class="chart-sub">Alimentação por lote e despesas individuais do animal (ficha do animal → Custo)</div>
      ${costLoteAnimalData.length ? costLoteAnimalData.map(d=>`
        <div class="bar-row">
          <span class="bar-label">${d.label}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${(d.value/maxCostLoteAnimal*100).toFixed(0)}%;background:${d.color}"></span></span>
          <span class="bar-val">R$ ${d.value.toFixed(0)}</span>
        </div>`).join('') : '<div class="empty-note">Nenhum custo vinculado a lote ou animal ainda.</div>'}
    </div>

    <div class="chart-card">
      <div class="chart-title">Estoque crítico</div>
      <div class="chart-sub">Insumos e alimentação abaixo do estoque mínimo cadastrado</div>
      ${criticalStock.length ? criticalStock.map(c=>`<div class="kv-row"><span class="k">${c.name} · ${c.farm}</span><span class="v">${c.stock} (mín. ${c.min})</span></div>`).join('') : '<div class="empty-note">Nenhum item em estoque crítico no momento.</div>'}
    </div>

    <div class="chart-card">
      <div class="chart-title">Atividades realizadas</div>
      <div class="chart-sub">Agenda unificada — Agricultura e Pecuária</div>
      <div class="stat-grid">
        <div class="stat-tile"><div class="stat-num">${concluidas}</div><div class="stat-lbl">Concluídas</div></div>
        <div class="stat-tile"><div class="stat-num">${pendentes}</div><div class="stat-lbl">Pendentes</div></div>
        <div class="stat-tile"><div class="stat-num">${atrasadas}</div><div class="stat-lbl">Atrasadas</div></div>
      </div>
    </div>

    <div class="card" style="display:flex;gap:8px;">
      <button class="action-btn" onclick="exportPDF('reports')">Exportar PDF</button>
      <button class="action-btn" onclick="exportCSV('reports')">Exportar planilha</button>
      <button class="action-btn" onclick="shareWhatsApp('reports')">WhatsApp</button>
    </div>
  `;
}

// ---------------------------------------------------------------
// CLIMA EM TEMPO REAL
// Fonte: Open-Meteo (api.open-meteo.com) — API pública, gratuita e sem
// chave de acesso, com CORS liberado, por isso pode ser chamada direto
// do navegador com segurança neste protótipo estático.
// A Weather API oficial do Google (Google Maps Platform) exige uma
// chave paga por requisição; embutir essa chave num arquivo HTML
// estático e compartilhável exporia a chave a qualquer pessoa que
// abrisse o arquivo — por isso não é uma opção segura aqui. Quando o
// AGROOP tiver um back-end de verdade (fase Flutter + Firebase do
// Documento Mestre), aí sim a chave fica protegida no servidor e dá
// para usar Google, INMET/SISDAGRO ou qualquer fonte oficial.
// ---------------------------------------------------------------
function parseCoords(str){
  if(!str) return null;
  const m = str.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if(!m) return null;
  const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
  if(isNaN(lat) || isNaN(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) return null;
  return {lat, lon};
}

// ---------------------------------------------------------------
// LOCALIZAÇÃO DA PROPRIEDADE — mapa interativo (Leaflet + OpenStreetMap,
// gratuito, sem chave de API) + botão de usar o GPS do aparelho. Usado no
// cadastro de propriedade, na edição de localização de uma já cadastrada, e
// na aba "Mapa" da propriedade (que também ganha o botão de traçar rota).
// ---------------------------------------------------------------
const LOCATION_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M12 22s7-7.58 7-12.5A7 7 0 0 0 5 9.5C5 14.42 12 22 12 22z"/><circle cx="12" cy="9.5" r="2.5"/></svg>`;
const ROUTE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.3 17.5 15.7 6.5"/></svg>`;
const DEFAULT_MAP_CENTER = { lat: -16.4707, lon: -54.6362 }; // Rondonópolis, MT — centro padrão enquanto não há coordenadas

function formatCoords(lat, lon){
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}
// Todos os mapas interativos abertos no momento, por prefixo do formulário
// ('nf' = nova propriedade, 'loc' = editar localização de uma já existente).
window._coordMaps = window._coordMaps || {};
function initCoordMap(prefix, initialCoords){
  const elId = prefix + '_map';
  const el = document.getElementById(elId);
  if(!el || typeof L === 'undefined') return null; // sem internet pra carregar o Leaflet — segue só com GPS/digitação manual
  if(window._coordMaps[prefix]){ window._coordMaps[prefix].map.remove(); delete window._coordMaps[prefix]; }
  const start = initialCoords || DEFAULT_MAP_CENTER;
  const map = L.map(elId, { attributionControl:false }).setView([start.lat, start.lon], initialCoords ? 14 : 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
  const marker = L.marker([start.lat, start.lon], { draggable:true }).addTo(map);
  function applyPoint(lat, lon){
    const input = document.getElementById(prefix+'_coords');
    if(input) input.value = formatCoords(lat, lon);
    const hint = document.getElementById(prefix+'_coords_hint');
    if(hint) hint.textContent = 'Ponto marcado no mapa.';
  }
  marker.on('dragend', ()=>{ const p = marker.getLatLng(); applyPoint(p.lat, p.lng); });
  map.on('click', (e)=>{ marker.setLatLng(e.latlng); applyPoint(e.latlng.lat, e.latlng.lng); });
  window._coordMaps[prefix] = { map, marker };
  setTimeout(()=>map.invalidateSize(), 200); // o container às vezes ainda está animando quando o mapa é criado
  return window._coordMaps[prefix];
}
// Mapa só de visualização (sem marcador arrastável) usado na aba "Mapa" da
// propriedade — mostra onde ela fica, sem deixar editar por ali sem querer.
function initFarmMapView(elId, coords){
  const el = document.getElementById(elId);
  if(!el || typeof L === 'undefined' || !coords) return;
  const map = L.map(elId, { attributionControl:false, dragging:true, scrollWheelZoom:false }).setView([coords.lat, coords.lon], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
  L.marker([coords.lat, coords.lon]).addTo(map);
  setTimeout(()=>map.invalidateSize(), 200);
}
// Botão "Usar minha localização atual" — pega o GPS do aparelho e marca o
// ponto sozinho, sem precisar tocar no mapa nem digitar nada.
function useMyLocationForCoords(prefix){
  if(!navigator.geolocation){ showToast('Este navegador não suporta localização por GPS.'); return; }
  showToast('Obtendo sua localização…');
  navigator.geolocation.getCurrentPosition((pos)=>{
    const { latitude, longitude } = pos.coords;
    const entry = window._coordMaps[prefix];
    if(entry){ entry.map.setView([latitude, longitude], 16); entry.marker.setLatLng([latitude, longitude]); }
    const input = document.getElementById(prefix+'_coords');
    if(input) input.value = formatCoords(latitude, longitude);
    const hint = document.getElementById(prefix+'_coords_hint');
    if(hint) hint.textContent = 'Localização atual marcada no mapa.';
    showToast('Localização atual marcada no mapa.');
  }, (err)=>{
    const msgs = { 1:'Permissão de localização negada — ative nas configurações do navegador/aparelho.', 2:'Não foi possível obter sua localização agora.', 3:'A busca pela localização demorou demais. Tente de novo.' };
    showToast(msgs[err.code] || 'Não foi possível obter sua localização.');
  }, { enableHighAccuracy:true, timeout:12000, maximumAge:0 });
}
// Digitou/colou as coordenadas manualmente — recentraliza o mapa (se houver
// um aberto) pro ponto digitado, em vez de deixar mapa e texto dessincronizados.
function onCoordsTextInput(prefix){
  const input = document.getElementById(prefix+'_coords');
  if(!input) return;
  const parsed = parseCoords(input.value);
  const entry = window._coordMaps[prefix];
  if(parsed && entry){ entry.map.setView([parsed.lat, parsed.lon], 14); entry.marker.setLatLng([parsed.lat, parsed.lon]); }
}
// ---------------------------------------------------------------
// BUSCAR LOCALIZAÇÃO PELO ENDEREÇO — pra quem não sabe mexer no mapa ou não
// tem as coordenadas de cabeça: digita cidade/bairro/endereço e o app
// converte pra coordenadas sozinho (geocodificação gratuita, sem chave,
// mesma API do Open-Meteo já usada pro clima).
// ---------------------------------------------------------------
async function searchAddressForCoords(prefix){
  const input = document.getElementById(prefix+'_addr');
  const resultsEl = document.getElementById(prefix+'_addr_results');
  if(!input || !resultsEl) return;
  const query = (input.value || '').trim();
  if(query.length < 3){ showToast('Digite pelo menos 3 letras do endereço, cidade ou bairro.'); return; }
  resultsEl.innerHTML = '<div class="kv-row"><span class="k">Buscando…</span></div>';
  try{
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=pt&format=json`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const list = data.results || [];
    if(!list.length){
      resultsEl.innerHTML = '<div class="kv-row"><span class="k">Nenhum lugar encontrado — tente digitar de outro jeito.</span></div>';
      return;
    }
    resultsEl.innerHTML = list.map(r=>{
      const parts = [r.admin2, r.admin1, r.country].filter(Boolean);
      const sub = parts.join(', ');
      return `<div class="kv-row" style="cursor:pointer;" onclick="pickAddressResult('${prefix}', ${r.latitude}, ${r.longitude}, '${(r.name+(sub?', '+sub:'')).replace(/'/g,"\\'")}')">
        <span class="k">${r.name}${sub?`<br><span style="font-weight:400;color:var(--ink-muted);font-size:10.5px;">${sub}</span>`:''}</span>
        <span class="v">›</span>
      </div>`;
    }).join('');
  }catch(e){
    resultsEl.innerHTML = '<div class="kv-row"><span class="k">Não foi possível buscar agora — verifique a internet e tente de novo.</span></div>';
  }
}
function pickAddressResult(prefix, lat, lon, label){
  const entry = window._coordMaps[prefix];
  if(entry){ entry.map.setView([lat, lon], 14); entry.marker.setLatLng([lat, lon]); }
  const input = document.getElementById(prefix+'_coords');
  if(input) input.value = formatCoords(lat, lon);
  const hint = document.getElementById(prefix+'_coords_hint');
  if(hint) hint.textContent = `Local marcado a partir do endereço: ${label}.`;
  const resultsEl = document.getElementById(prefix+'_addr_results');
  if(resultsEl) resultsEl.innerHTML = '';
  const addrInput = document.getElementById(prefix+'_addr');
  if(addrInput) addrInput.value = '';
  showToast('Localização marcada a partir do endereço.');
}
// Abre o app de mapas do aparelho (Google Maps, que no celular abre o app
// nativo se instalado) já traçando a rota até a propriedade.
function openRouteToFarm(farmId){
  const f = farms[farmId];
  if(!f) return;
  const coords = parseCoords(f.coords);
  if(!coords){ showToast('Cadastre a localização da propriedade pra habilitar a rota.'); openEditFarmLocation(farmId); return; }
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`, '_blank', 'noopener');
}
// Sheet pra marcar/editar a localização de uma propriedade já cadastrada
// (ex: uma que foi criada offline sem coordenadas, ou que precisa corrigir o ponto).
function openEditFarmLocation(farmId){
  const f = farms[farmId];
  if(!f) return;
  const current = parseCoords(f.coords);
  openSheet('Localização da propriedade', `
    <div class="form-field">
      <label>Buscar por endereço</label>
      <div style="display:flex;gap:6px;">
        <input id="loc_addr" placeholder="Cidade, bairro ou endereço" style="flex:1;">
        <button type="button" class="icon-btn-sm" style="width:auto;padding:0 12px;" onclick="searchAddressForCoords('loc')">Buscar</button>
      </div>
      <div id="loc_addr_results"></div>
    </div>
    <div id="loc_map" class="coord-map"></div>
    <button type="button" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:8px;" onclick="useMyLocationForCoords('loc')">${LOCATION_SVG} Usar minha localização atual</button>
    <div class="form-field" style="margin-top:10px;"><label>Coordenadas</label><input id="loc_coords" placeholder="-15.000, -50.000" value="${current ? f.coords : ''}" onchange="onCoordsTextInput('loc')"></div>
    <div id="loc_coords_hint" style="font-size:10.5px;color:var(--ink-muted);margin:-8px 0 12px;">Busque pelo endereço, toque no mapa, use sua localização atual, ou digite as coordenadas.</div>
    <button class="sheet-save" onclick="saveFarmLocation('${farmId}')">Salvar localização</button>
  `);
  setTimeout(()=>initCoordMap('loc', current), 150);
}
async function saveFarmLocation(farmId){
  const f = farms[farmId];
  if(!f) return;
  const raw = (document.getElementById('loc_coords').value || '').trim();
  if(!raw || !parseCoords(raw)){ showToast('Marque um ponto no mapa, use sua localização atual, ou digite no formato -15.000, -50.000.'); return; }

  f.coords = raw;
  closeSheet();
  if(document.getElementById('screen-property').classList.contains('active')) renderPropertyTab();
  renderPropertiesList();

  if(!BACKEND_ENABLED || !currentAuthUser){ showToast('Localização atualizada.'); return; }

  if(f.pendingSync){
    // A propriedade ainda nem foi criada no servidor (foi cadastrada
    // offline) — só atualiza o que já está esperando na fila pra ser enviado.
    const op = syncQueue.find(o => o.entity==='farm' && o.kind==='insert' && o.payload.tempId===farmId);
    if(op){ op.payload.insertData.coords = raw; saveSyncQueueToStorage(); }
    showToast('Localização atualizada (será enviada junto com a propriedade).');
    return;
  }
  if(!navigator.onLine){
    enqueueSyncOp('farm', 'update', { id: farmId, changes: { coords: raw } });
    showToast('Sem conexão — localização salva no aparelho e será enviada quando a internet voltar.');
    return;
  }
  try{
    const { error } = await sb.from('farms').update({ coords: raw }).eq('id', farmId);
    if(error){
      if(looksLikeNetworkError(error)){
        enqueueSyncOp('farm', 'update', { id: farmId, changes: { coords: raw } });
        showToast('Sem conexão — localização salva no aparelho e será enviada quando a internet voltar.');
      } else {
        showToast('Não foi possível salvar a localização agora: ' + (error.message || 'tente de novo.'));
      }
    } else {
      showToast('Localização atualizada.');
    }
  }catch(e){
    enqueueSyncOp('farm', 'update', { id: farmId, changes: { coords: raw } });
    showToast('Sem conexão — localização salva no aparelho e será enviada quando a internet voltar.');
  }
  refreshSyncUI();
}

function openEditFarmDescription(farmId){
  const f = farms[farmId];
  if(!f) return;
  openSheet('Descrição da propriedade', `
    <div class="form-field"><label>Descrição</label>
      <textarea id="fd_desc" rows="5" placeholder="Ex: Propriedade de cria e recria, dividida em 6 piquetes, com sede na entrada da fazenda.">${(f.description||'').replace(/</g,'&lt;')}</textarea>
      <button type="button" class="fab-btn ghost" style="width:100%;justify-content:center;margin-top:6px;padding:7px;" onclick="startVoiceDictation('fd_desc', this)">🎙️ Ditar por voz</button>
    </div>
    <button class="sheet-save" onclick="saveFarmDescription('${farmId}')">Salvar descrição</button>
  `);
}
async function saveFarmDescription(farmId){
  const f = farms[farmId];
  if(!f) return;
  const description = (document.getElementById('fd_desc').value || '').trim();
  f.description = description;
  closeSheet();
  if(document.getElementById('screen-property').classList.contains('active')) renderPropertyTab();

  if(!BACKEND_ENABLED || !currentAuthUser){ showToast('Descrição atualizada.'); return; }

  if(f.pendingSync){
    const op = syncQueue.find(o => o.entity==='farm' && o.kind==='insert' && o.payload.tempId===farmId);
    if(op){ op.payload.insertData.description = description || null; saveSyncQueueToStorage(); }
    showToast('Descrição atualizada (será enviada junto com a propriedade).');
    return;
  }
  if(!navigator.onLine){
    enqueueSyncOp('farm', 'update', { id: farmId, changes: { description: description || null } });
    showToast('Sem conexão — descrição salva no aparelho e será enviada quando a internet voltar.');
    return;
  }
  try{
    const { error } = await sb.from('farms').update({ description: description || null }).eq('id', farmId);
    if(error){
      if(looksLikeNetworkError(error)){
        enqueueSyncOp('farm', 'update', { id: farmId, changes: { description: description || null } });
        showToast('Sem conexão — descrição salva no aparelho e será enviada quando a internet voltar.');
      } else {
        showToast('Não foi possível salvar a descrição agora: ' + (error.message || 'tente de novo.'));
      }
    } else {
      showToast('Descrição atualizada.');
    }
  }catch(e){
    enqueueSyncOp('farm', 'update', { id: farmId, changes: { description: description || null } });
    showToast('Sem conexão — descrição salva no aparelho e será enviada quando a internet voltar.');
  }
  refreshSyncUI();
}

// ---------------------------------------------------------------
// SOL DA MANHÃ, SOL DA TARDE, LUA EM CADA FASE, ECLIPSE E LUA DE
// SANGUE — o ícone de céu limpo/poucas nuvens agora varia de verdade
// (em vez de um ☀️/🌙 fixo o dia inteiro), usando a hora local da
// própria fazenda e a fase real da lua, com datas reais de eclipses.
// ---------------------------------------------------------------

// Eclipses reais (fonte: EclipseWise.com, datas em UT). Comparado pela
// data local da fazenda (o Open-Meteo já devolve o horário no fuso da
// própria propriedade), então cobre corretamente qualquer lugar do Brasil.
const KNOWN_ECLIPSES = [
  { date:'2026-02-17', kind:'solar', type:'annular' },
  { date:'2026-03-03', kind:'lunar', type:'total' },      // Lua de sangue
  { date:'2026-08-12', kind:'solar', type:'total' },
  { date:'2026-08-28', kind:'lunar', type:'partial' },
  { date:'2027-02-06', kind:'solar', type:'annular' },
  { date:'2027-02-20', kind:'lunar', type:'penumbral' },
  { date:'2027-07-18', kind:'lunar', type:'penumbral' },
  { date:'2027-08-02', kind:'solar', type:'total' },
  { date:'2027-08-17', kind:'lunar', type:'penumbral' },
  { date:'2028-01-12', kind:'lunar', type:'partial' },
  { date:'2028-01-26', kind:'solar', type:'annular' },
  { date:'2028-07-06', kind:'lunar', type:'partial' },
  { date:'2028-07-22', kind:'solar', type:'total' },
  { date:'2028-12-31', kind:'lunar', type:'total' },      // Lua de sangue
];
function findEclipseForDate(isoDate){
  return KNOWN_ECLIPSES.find(e => e.date === isoDate) || null;
}

// Fase real da lua (mês sinódico ≈ 29,530588853 dias), ancorada numa
// lua nova de referência conhecida — cobre as 8 fases padrão.
const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);
function moonPhaseFraction(date){
  const diffDays = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86400000;
  let phase = (diffDays % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  if(phase < 0) phase += 1;
  return phase; // 0 = lua nova, 0.5 = lua cheia
}
function moonPhaseIcon(date){
  const icons = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  return icons[Math.round(moonPhaseFraction(date) * 8) % 8];
}

// Só entra em ação pra céu limpo/poucas nuvens (código 0/1) — chuva,
// tempestade, neblina e neve continuam com seus próprios ícones fixos,
// fazem sentido em qualquer hora do dia ou da noite.
function celestialIconForDate(timeIso, isDay){
  const d = timeIso ? new Date(timeIso) : new Date();
  const isoDate = (timeIso || '').split('T')[0] || isoToday();
  const eclipse = findEclipseForDate(isoDate);
  if(isDay === 0){
    if(eclipse && eclipse.kind === 'lunar' && eclipse.type === 'total') return 'eclipse-lunar-blood'; // lua de sangue
    if(eclipse && eclipse.kind === 'lunar') return '🌘';
    return moonPhaseIcon(d);
  }
  if(eclipse && eclipse.kind === 'solar') return 'eclipse-solar';
  return d.getHours() < 12 ? '🌅' : '☀️';
}

function weatherCodeInfo(code, isDay, timeIso){
  const map = {
    0:{icon:'☀️',cond:'Céu limpo'}, 1:{icon:'🌤️',cond:'Poucas nuvens'}, 2:{icon:'⛅',cond:'Parcialmente nublado'},
    3:{icon:'☁️',cond:'Nublado'}, 45:{icon:'🌫️',cond:'Neblina'}, 48:{icon:'🌫️',cond:'Neblina com geada'},
    51:{icon:'🌦️',cond:'Garoa fraca'}, 53:{icon:'🌦️',cond:'Garoa'}, 55:{icon:'🌦️',cond:'Garoa forte'},
    61:{icon:'🌧️',cond:'Chuva fraca'}, 63:{icon:'🌧️',cond:'Chuva'}, 65:{icon:'🌧️',cond:'Chuva forte'},
    71:{icon:'❄️',cond:'Neve fraca'}, 73:{icon:'❄️',cond:'Neve'}, 75:{icon:'❄️',cond:'Neve forte'},
    80:{icon:'🌧️',cond:'Pancadas de chuva'}, 81:{icon:'🌧️',cond:'Pancadas de chuva'}, 82:{icon:'🌧️',cond:'Pancadas fortes'},
    95:{icon:'⛈️',cond:'Tempestade'}, 96:{icon:'⛈️',cond:'Tempestade com granizo'}, 99:{icon:'⛈️',cond:'Tempestade forte'},
  };
  if(code===0 || code===1){
    return { icon: celestialIconForDate(timeIso, isDay), cond: code===0?'Céu limpo':'Poucas nuvens' };
  }
  // À noite, "parcialmente nublado" também troca de ícone (nuvem, sem sol/lua
  // brilhando por trás). Chuva/tempestade/neblina/neve não mudam com a hora.
  const nightMap = { 2:{icon:'☁️',cond:'Parcialmente nublado'} };
  if(isDay === 0 && nightMap[code]) return nightMap[code];
  return map[code] || {icon:'❔', cond:'Condição desconhecida'};
}
async function fetchWeatherForFarm(farmId){
  const f = farms[farmId];
  if(!f) return;
  const coords = parseCoords(f.coords);
  if(!coords){
    f.weather = {...f.weather, cond:'Sem coordenadas válidas cadastradas', icon:'❔', live:false};
    return;
  }
  if(isOffline){
    return; // simula app real: sem internet, mantém o último clima já sincronizado
  }
  try{
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}`+
      `&current_weather=true`+
      `&hourly=precipitation_probability,precipitation,temperature_2m,relative_humidity_2m,apparent_temperature`+
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max`+
      `&past_days=3&forecast_days=6&timezone=auto`;
    // Limite de tempo pro pedido — sem isso, numa conexão ruim (comum em área
    // rural) o "Atualizando clima..." podia ficar girando por tempo
    // indefinido se o Open-Meteo demorasse muito ou nem respondesse; assim,
    // depois de 9s desiste e cai na mensagem de "não foi possível obter".
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    let res;
    try{
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const cw = data.current_weather;
    const info = weatherCodeInfo(cw.weathercode, cw.is_day, cw.time);
    const idx = data.hourly && data.hourly.time ? data.hourly.time.indexOf(cw.time) : -1;
    const rain = idx>-1 ? data.hourly.precipitation_probability[idx] : 0;
    const humidity = idx>-1 ? data.hourly.relative_humidity_2m[idx] : null;
    const feelsLikeRaw = idx>-1 ? data.hourly.apparent_temperature[idx] : null;
    const hourlyForecast = idx>-1 ? data.hourly.time.slice(idx, idx+8).map((t,i)=>({
      time:t, temp:Math.round(data.hourly.temperature_2m[idx+i]), rain:data.hourly.precipitation_probability[idx+i],
    })) : [];
    const dailyAll = (data.daily && data.daily.time) ? data.daily.time.map((d,i)=>({
      date:d, max:Math.round(data.daily.temperature_2m_max[i]), min:Math.round(data.daily.temperature_2m_min[i]),
      rain:data.daily.precipitation_probability_max[i], code:data.daily.weathercode[i],
    })) : [];
    const dailyForecast = dailyAll.filter(d=>d.date>=isoToday());
    const pastRainMm = idx>-1 ? Math.round(data.hourly.precipitation.slice(Math.max(0, idx-72), idx).reduce((s,v)=>s+(v||0),0)*10)/10 : 0;
    const alerts = [];
    dailyForecast.slice(0,3).forEach(d=>{
      if(d.min!=null && d.min<=3) alerts.push('Risco de geada em '+fmtDate(d.date));
      if(d.max!=null && d.max>=38) alerts.push('Calor extremo em '+fmtDate(d.date));
      if([95,96,99].includes(d.code)) alerts.push('Risco de tempestade em '+fmtDate(d.date));
    });
    if(pastRainMm<5 && dailyForecast.slice(0,3).every(d=>(d.rain||0)<20)) alerts.push('Baixa chance de chuva nos próximos dias — atenção à seca');
    const hhmm = (cw.time||'').split('T')[1] || '';
    f.weather = {
      temp: Math.round(cw.temperature), cond: info.cond, icon: info.icon, updated: hhmm, rain,
      humidity, feelsLike: feelsLikeRaw!=null?Math.round(feelsLikeRaw):null,
      windspeed: cw.windspeed, winddirection: cw.winddirection,
      hourlyForecast, dailyForecast: dailyForecast.slice(0,5), pastRainMm, alerts, live:true,
    };
  }catch(e){
    f.weather = {...f.weather, cond:'Não foi possível obter o clima agora (sem internet ou API instável)', icon:'⚠️', live:false};
  }
}
// Ícone de "atualizar" desenhado em SVG (não depende de fonte/emoji do sistema — evita
// o mesmo problema de renderização inconsistente que a seta do seletor de clima tinha).
const REFRESH_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>`;
async function refreshFarmWeather(farmId, targetElId){
  const el = document.getElementById(targetElId);
  if(el){
    const f = farms[farmId];
    el.innerHTML = weatherCardHTML(f, farmId, targetElId, true);
  }
  await fetchWeatherForFarm(farmId);
  recomputeTalhaoConditions(farmId);
  renderWeatherCard(targetElId, farmId);
  if(document.getElementById('screen-property').classList.contains('active') && window._currentFarm===farmId) renderPropertyTab();
  if(document.getElementById('screen-home').classList.contains('active')) updateBellBadge();
}
function weatherCardHTML(f, farmId, targetElId, loading){
  if(loading){
    return `<div class="weather-card"><div><div class="wcond" style="font-weight:800;color:var(--ink);">Atualizando clima em tempo real...</div><div class="wupdated">Consultando Open-Meteo</div></div><div class="weather-spinner"></div></div>`;
  }
  return `<div class="weather-card" style="cursor:pointer;flex-wrap:wrap;" onclick="openFullForecastSheet('${farmId}')">
    <div>
      <div class="temp">${f.weather.temp!=null?f.weather.temp+'°C':'—'}</div>
      <div class="wcond">${f.name} · ${f.weather.cond}</div>
      <div class="wupdated">Atualizado às ${f.weather.updated||'—'} · chance de chuva ${f.weather.rain||0}% · toque para ver previsão completa</div>
      ${f.weather.alerts && f.weather.alerts.length ? `<div class="wupdated" style="display:flex;align-items:flex-start;gap:5px;color:var(--critical);font-weight:700;margin-top:5px;"><span style="flex:none;margin-top:1px;">${svgIcon('warning',{size:12})}</span><span>${f.weather.alerts[0]}</span></div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
      <div class="weather-icon">${emojiIcon(f.weather.icon,{size:28})}</div>
      <button class="icon-btn-sm" title="Atualizar clima agora" onclick="event.stopPropagation();refreshFarmWeather('${farmId}','${targetElId}')">${REFRESH_SVG}</button>
    </div>
    ${weatherForecastStripHTML(f.weather.dailyForecast)}
  </div>`;
}
// Tira-teima de "próximos dias" (Hoje/Amanhã/Qui/Sex/Sáb + ícone + mín-máx) —
// só aparece dentro do cartão de clima no modo desktop (o CSS esconde no
// celular, onde já existe o botão "ver previsão completa" pra isso). Some
// sozinho se ainda não tiver previsão de dias carregada.
function weatherForecastStripHTML(dailyForecast){
  if(!dailyForecast || !dailyForecast.length) return '';
  const days = dailyForecast.slice(0,5).map((d,i)=>{
    const dt = parseISO(d.date);
    const label = i===0 ? 'Hoje' : i===1 ? 'Amanhã' : (dt ? DIAS_SEMANA_PT[dt.getDay()] : '—');
    const info = weatherCodeInfo(d.code, 1, d.date+'T12:00:00');
    return `<div class="wc-forecast-day">
      <span class="wcf-lbl">${label}</span>
      <span class="wcf-ic">${emojiIcon(info.icon,{size:18})}</span>
      <span class="wcf-temp">${d.max}°<span class="wcf-min">${d.min}°</span></span>
    </div>`;
  }).join('');
  return `<div class="wc-forecast-strip">${days}</div>`;
}
function renderWeatherCard(targetElId, farmId){
  const el = document.getElementById(targetElId);
  if(!el) return;
  if(!farmId || !farms[farmId]){
    el.innerHTML = `<div class="weather-card" style="justify-content:center;"><div class="wupdated" style="text-align:center;">Cadastre sua primeira propriedade para acompanhar o clima aqui.</div></div>`;
    return;
  }
  el.innerHTML = weatherCardHTML(farms[farmId], farmId, targetElId, false);
}
let homeWeatherFarmId = null;
function renderHomeWeatherSelect(){
  const el = document.getElementById('homeWeatherFarmSelect');
  if(!el) return;
  if(!homeWeatherFarmId || !farms[homeWeatherFarmId]) homeWeatherFarmId = Object.keys(farms)[0];
  if(!homeWeatherFarmId){ el.innerHTML = '<div class="custom-select-trigger" style="cursor:default;"><span>Nenhuma propriedade cadastrada</span></div>'; return; }
  const options = Object.values(farms).map(f=>({value:f.id, label:f.name}));
  el.innerHTML = customSelectHTML('homeWeatherFarmSelect_cs', options, homeWeatherFarmId, 'setHomeWeatherFarm');
}
function setHomeWeatherFarm(farmId){
  homeWeatherFarmId = farmId;
  renderHomeWeatherSelect();
  renderWeatherCard('homeWeatherCard', farmId);
  renderDesktopWeatherCard(farmId);
}
// ---------------------------------------------------------------
// "CLIMA AGORA" — versão escura do cartão de clima, só do painel desktop
// (Início). Mesmos dados de weatherCardHTML (temperatura, condição,
// previsão dos próximos dias), num cartão maior no estilo dos cartões de
// módulo (Agricultura/Pecuária), com um seletor de propriedade embutido.
// ---------------------------------------------------------------
function desktopWeatherCardHTML(f, farmId){
  const w = f.weather || {};
  const humidity = w.humidity!=null ? Math.round(w.humidity)+'%' : '—';
  const rain = (w.rain!=null ? w.rain : 0)+'%';
  const wind = w.windspeed!=null ? Math.round(w.windspeed)+' km/h' : '—';
  const options = Object.values(farms).map(o=>`<option value="${o.id}" ${o.id===farmId?'selected':''}>${o.name}</option>`).join('');
  return `<div class="dw-card">
    <div class="dw-top">
      <select class="dw-farmsel" onchange="setHomeWeatherFarm(this.value)">${options}</select>
    </div>
    <div class="dw-main">
      <div class="dw-ic">${emojiIcon(w.icon,{size:38})}</div>
      <div>
        <div class="dw-temp">${w.temp!=null?w.temp+'°C':'—'}</div>
        <div class="dw-cond">${w.cond||'—'}</div>
        <div class="dw-updated">Atualizado às ${w.updated||'—'}</div>
      </div>
    </div>
    <div class="dw-metrics">
      <div class="dw-metric"><div class="dw-metric-ic">${svgIcon('droplet',{size:15})}</div><div class="dw-metric-val">${humidity}</div><div class="dw-metric-lbl">Umidade</div></div>
      <div class="dw-metric"><div class="dw-metric-ic">${svgIcon('cloud-rain-mono',{size:15})}</div><div class="dw-metric-val">${rain}</div><div class="dw-metric-lbl">Chuva</div></div>
      <div class="dw-metric"><div class="dw-metric-ic">${svgIcon('wind-mono',{size:15})}</div><div class="dw-metric-val">${wind}</div><div class="dw-metric-lbl">Vento</div></div>
    </div>
    ${w.dailyForecast && w.dailyForecast.length ? `
    <div class="dw-forecast-label">Previsão para os próximos dias</div>
    <div class="dw-forecast-strip">${w.dailyForecast.slice(0,5).map((d,i)=>{
      const dt = parseISO(d.date);
      const label = i===0 ? 'Hoje' : i===1 ? 'Amanhã' : (dt ? DIAS_SEMANA_PT[dt.getDay()] : '—');
      const info = weatherCodeInfo(d.code, 1, d.date+'T12:00:00');
      return `<div class="dwf-day"><span class="dwf-lbl">${label}</span><span class="dwf-ic">${emojiIcon(info.icon,{size:16})}</span><span><span class="dwf-max">${d.max}°</span> <span class="dwf-min">${d.min}°</span></span></div>`;
    }).join('')}</div>` : ''}
  </div>`;
}
function renderDesktopWeatherCard(farmId){
  const el = document.getElementById('homeWeatherCardDesktop');
  if(!el) return;
  const id = farmId || homeWeatherFarmId;
  if(!id || !farms[id]){
    el.innerHTML = `<div class="dw-card" style="text-align:center;"><div class="dw-updated">Cadastre sua primeira propriedade para acompanhar o clima aqui.</div></div>`;
    return;
  }
  el.innerHTML = desktopWeatherCardHTML(farms[id], id);
}
async function fetchAllFarmsWeather(){
  const ids = Object.keys(farms);
  // Busca o clima de todas as propriedades AO MESMO TEMPO (em paralelo) em
  // vez de uma de cada vez — antes, com várias propriedades cadastradas, o
  // tempo total era a SOMA do tempo de cada uma (podendo passar de 10-20s);
  // agora é só o tempo da mais lenta.
  await Promise.all(ids.map(async (id) => {
    await fetchWeatherForFarm(id);
    recomputeTalhaoConditions(id);
  }));
  renderHomeWeatherSelect();
  renderWeatherCard('homeWeatherCard', homeWeatherFarmId);
  renderDesktopWeatherCard(homeWeatherFarmId);
  if(document.getElementById('screen-property').classList.contains('active') && window._currentFarm){
    renderWeatherCard('pdWeatherCard', window._currentFarm);
    renderPropertyTab();
  }
  renderHome();
  renderNotifications();
}

// ---------------------------------------------------------------
// PREVISÃO COMPLETA (por hora, próximos dias, histórico de chuva,
// alertas de geada/calor/tempestade/seca) — seção 4 do pedido do Luiz
// ---------------------------------------------------------------
function openFullForecastSheet(farmId){
  const f = farms[farmId];
  const w = f.weather;
  if(!w.live){
    openSheet('Previsão completa — ' + f.name, `<div class="empty-note">${w.cond} Toque em ↻ no cartão de clima para tentar novamente.</div>`);
    return;
  }
  const hourlyHTML = (w.hourlyForecast||[]).map(h=>`
    <div class="bar-row"><span class="bar-label">${(h.time||'').split('T')[1]||''}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${h.rain}%;background:${CAT[0]}"></span></span>
      <span class="bar-val">${h.temp}° · ${h.rain}%</span></div>`).join('');
  const dailyHTML = (w.dailyForecast||[]).map(d=>{
    const info = weatherCodeInfo(d.code, 1, d.date+'T12:00:00');
    return `<div class="kv-row"><span class="k">${fmtDate(d.date)} ${info.icon}</span><span class="v">${d.min}°–${d.max}° · chuva ${d.rain}%</span></div>`;
  }).join('');
  const alertsHTML = (w.alerts||[]).length ? w.alerts.map(a=>`<div class="empty-note">⚠ ${a}</div>`).join('') : '<div class="kv-row"><span class="k">Nenhum alerta no momento</span></div>';
  openSheet('Previsão completa — ' + f.name, `
    <div class="stat-grid" style="margin-bottom:10px;">
      <div class="stat-tile"><div class="stat-num">${w.temp}°C</div><div class="stat-lbl">Temperatura atual</div></div>
      <div class="stat-tile"><div class="stat-num">${w.feelsLike!=null?w.feelsLike+'°C':'—'}</div><div class="stat-lbl">Sensação térmica</div></div>
      <div class="stat-tile"><div class="stat-num">${w.humidity!=null?w.humidity+'%':'—'}</div><div class="stat-lbl">Umidade do ar</div></div>
      <div class="stat-tile"><div class="stat-num">${w.windspeed!=null?Math.round(w.windspeed)+' km/h':'—'}</div><div class="stat-lbl">Vento (${w.winddirection!=null?Math.round(w.winddirection)+'°':'—'})</div></div>
    </div>
    <div class="card"><div class="kv-row"><span class="k">Chuva acumulada (últimos 3 dias)</span><span class="v">${w.pastRainMm} mm</span></div></div>
    <div class="h-eyebrow" style="padding:8px 0 4px;">Alertas</div>
    ${alertsHTML}
    <div class="h-eyebrow" style="padding:8px 0 4px;">Previsão por hora</div>
    <div class="card">${hourlyHTML || '<div class="kv-row"><span class="k">Sem dados por hora</span></div>'}</div>
    <div class="h-eyebrow" style="padding:8px 0 4px;">Próximos dias</div>
    <div class="card">${dailyHTML || '<div class="kv-row"><span class="k">Sem previsão disponível</span></div>'}</div>
  `);
}

// ---------------------------------------------------------------
// ANÁLISE DAS CONDIÇÕES OPERACIONAIS — cruza a atividade agendada
// (plantio/pulverização/colheita) com o clima real da fazenda.
// Sem clima ao vivo (offline/erro), mantém a classificação padrão.
// ---------------------------------------------------------------
function classifyTalhao(t, w){
  if(!t.operationType) return null;
  const rain = w.rain ?? 50, wind = w.windspeed ?? 10, temp = w.temp ?? 25;
  if(t.operationType==='Pulverização'){
    if(wind>25 || rain>60) return {status:'desfavoravel', reason:`Vento de ${Math.round(wind)} km/h e ${rain}% de chance de chuva tornam a pulverização arriscada (deriva ou lavagem do produto).`};
    if(wind>15 || rain>35) return {status:'atencao', reason:`Vento de ${Math.round(wind)} km/h e ${rain}% de chance de chuva pedem atenção antes de pulverizar.`};
    return {status:'favoravel', reason:`Vento de ${Math.round(wind)} km/h e apenas ${rain}% de chance de chuva — condição adequada para pulverizar.`};
  }
  if(t.operationType==='Plantio'){
    if(rain<10) return {status:'atencao', reason:`Apenas ${rain}% de chance de chuva — risco de falta de umidade para a germinação.`};
    if(rain>80) return {status:'atencao', reason:`${rain}% de chance de chuva — risco de excesso de água e compactação do solo.`};
    if(temp<10 || temp>38) return {status:'desfavoravel', reason:`Temperatura de ${temp}°C fora da faixa recomendada para o plantio.`};
    return {status:'favoravel', reason:`Chance de chuva de ${rain}% e temperatura de ${temp}°C — condição favorável para o plantio.`};
  }
  if(t.operationType==='Colheita'){
    if(rain>50) return {status:'desfavoravel', reason:`${rain}% de chance de chuva prejudica a entrada de máquinas e a qualidade do grão.`};
    if(rain>25) return {status:'atencao', reason:`${rain}% de chance de chuva — monitore antes de iniciar a colheita.`};
    return {status:'favoravel', reason:`Apenas ${rain}% de chance de chuva — boa janela para colher.`};
  }
  return null;
}
function findNextWindow(f){
  const days = (f.weather.dailyForecast||[]).slice(1);
  const good = days.find(d=>(d.rain||0)<30);
  return good ? fmtDate(good.date) : 'Consulte a previsão dos próximos dias';
}
function recomputeTalhaoConditions(farmId){
  const f = farms[farmId];
  if(!f) return; // a propriedade pode ter sido apagada enquanto o clima ainda estava sendo buscado
  if(!f.weather || !f.weather.live) return; // mantém classificação padrão sem clima ao vivo
  (f.talhoes||[]).forEach(t=>{
    const result = classifyTalhao(t, f.weather);
    if(result){
      t.status = result.status; t.reason = result.reason; t.updated = f.weather.updated;
      t.nextWindow = result.status==='favoravel' ? null : findNextWindow(f);
    }
  });
  generateAutoNotifications(farmId);
}
// Gera notificações no formato do exemplo do Documento Mestre:
// "Nome, atividade está programada... Condição X para a atividade."
function generateAutoNotifications(farmId){
  const f = farms[farmId];
  if(!f) return; // a propriedade pode ter sido apagada nesse meio-tempo
  const userFirstName = (teamMembers[0]||{name:'Luiz'}).name.split(' ')[0];
  (f.talhoes||[]).forEach(t=>{
    if(!t.operationType || t.status==='dados') return;
    const autoId = `auto-${farmId}-${t.id}`;
    const favoravel = t.status==='favoravel';
    const icon = favoravel ? '✅' : (t.status==='desfavoravel' ? '⛔' : '⚠️');
    const title = favoravel ? `Condição favorável para ${t.operationType.toLowerCase()}` : `Atenção: ${t.operationType.toLowerCase()} em ${t.status==='desfavoravel'?'condição desfavorável':'condição de atenção'}`;
    const body = `${userFirstName}, ${t.activity!=='—'?t.activity.toLowerCase():t.operationType.toLowerCase()+' está programado(a)'} na ${f.name} (${t.name}). ${t.reason} Condição ${statusMeta[t.status].label.toLowerCase()} para ${t.operationType.toLowerCase()}.`;
    const priority = t.status==='desfavoravel' ? 'Alta' : (t.status==='atencao' ? 'Média' : 'Baixa');
    const existing = notifications.find(n=>n.id===autoId);
    // Se a condição não mudou de verdade desde a última vez (mesmo título e texto),
    // não recria a notificação — isso preservava o "lida" mesmo depois de marcada,
    // porque toda atualização de clima recriava o card do zero como não-lida de novo.
    if(existing && existing.title===title && existing.body===body) return;
    notifications = notifications.filter(n=>n.id!==autoId);
    notifications.unshift({
      id:autoId, farm:f.id, icon, title, body, time:f.weather.updated||'agora', category:'Clima', priority,
      target:{screen:'condition', farm:f.id, talhao:t.id},
      // uma condição que realmente mudou (diferente do que existia antes) é um alerta novo
      // de verdade — por isso entra como não lida, mesmo que a versão anterior já tivesse
      // sido marcada como lida.
      read: false,
    });
  });
}

// ---------------------------------------------------------------
// EXPORTAÇÃO REAL — PDF (jsPDF), planilha (CSV) e WhatsApp (wa.me)
// ---------------------------------------------------------------
function reportRows(context){
  if(context==='reports'){
    const rows = [['Propriedade','Cidade/UF','Tipo','Área (ha)','Talhões','Lotes','Animais']];
    Object.values(farms).forEach(f=>rows.push([f.name, `${titleCasePt(f.city)}/${f.state}`, f.type, parseInt(f.area)||0, (f.talhoes||[]).length, (f.lotes||[]).length, (f.animals||[]).length]));
    return {title:'Relatório geral — AGROOP', rows};
  } else {
    const f = farms[context];
    const rows = [['Talhão/Lote','Área ou Qtd','Estágio/Categoria','Status']];
    (f.talhoes||[]).forEach(t=>rows.push([t.name, t.area, t.stage, statusMeta[t.status].label]));
    (f.lotes||[]).forEach(l=>rows.push([l.name, l.qty+' animais', l.category, l.pasture]));
    return {title:`Relatório — ${f.name}`, rows};
  }
}
function exportCSV(context){
  const {title, rows} = reportRows(context);
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = title.replace(/[^a-z0-9]+/gi,'_') + '.csv';
  document.body.appendChild(a); a.click(); a.remove();
  registerChange('Planilha exportada: ' + title);
}
function exportPDF(context){
  // Gerado 100% offline via a caixa de impressão do navegador (Salvar como PDF) —
  // sem depender de nenhuma biblioteca externa, coerente com o requisito de
  // funcionamento offline do app (seção 9.4 do Documento Mestre).
  const {title, rows} = reportRows(context);
  const win = window.open('', '_blank', 'width=820,height=920');
  if(!win){ showToast('Permita pop-ups no navegador para exportar o PDF'); return; }
  const htmlRows = rows.map((r,i)=>`<tr>${r.map(c=>`<${i===0?'th':'td'}>${String(c)}</${i===0?'th':'td'}>`).join('')}</tr>`).join('');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>
    body{font-family:system-ui,-apple-system,sans-serif;padding:28px;color:#1b1b18;}
    h1{font-size:19px;margin:0 0 2px;} p{color:#767267;font-size:11px;margin:0 0 18px;}
    table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd8c8;padding:7px 9px;font-size:12px;text-align:left;}
    th{background:#eaf4ec;color:#143f22;} tr:nth-child(even) td{background:#faf9f4;}
  </style></head><body>
    <h1>🌾 ${title}</h1><p>Gerado pelo AGROOP em ${new Date().toLocaleDateString('pt-BR')}</p>
    <table>${htmlRows}</table>
    <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</` + `script>
  </body></html>`);
  win.document.close();
  registerChange('PDF exportado: ' + title);
}
function shareWhatsApp(context){
  const {title, rows} = reportRows(context);
  const text = title + '\n\n' + rows.slice(0,8).map(r=>r.join(' · ')).join('\n');
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  registerChange('Compartilhamento via WhatsApp aberto: ' + title);
}

// ---------------------------------------------------------------
// TELA "MAIS" — Equipe, Sincronização, Fontes climáticas,
// Preferências de notificação, Suporte e Sobre — todas funcionais.
// ---------------------------------------------------------------
const TEAM_ROLES = ['Proprietário','Gerente','Veterinário(a)','Agrônomo(a)','Funcionário de campo','Administrativo'];
const ACCESS_RANK = {'Administrador':3, 'Editor':2, 'Leitura e registro':1};
let teamMembers = [
  {id:'u1', name:'Luiz Henrique', role:'Proprietário', access:'Administrador', fixed:true},
  {id:'u2', name:'Marcos Lima', role:'Gerente', access:'Editor'},
  {id:'u3', name:'Dra. Ana Souza', role:'Veterinário(a)', access:'Editor'},
  {id:'u4', name:'Equipe de campo', role:'Funcionário de campo', access:'Leitura e registro'},
];
let currentViewMemberId = 'u1';
function currentViewMember(){ return teamMembers.find(x=>x.id===currentViewMemberId) || teamMembers[0]; }
function currentAccess(){ return currentViewMember().access; }
function requireAccess(minLevel, actionLabel){
  const rank = ACCESS_RANK[currentAccess()] || 3;
  const minRank = ACCESS_RANK[minLevel] || 3;
  if(rank < minRank){ showToast(`Ação bloqueada: seu papel simulado (${currentViewMember().role} · ${currentAccess()}) não tem permissão para ${actionLabel}.`); return false; }
  return true;
}
function updateAccessBanner(){
  const el = document.getElementById('accessBanner');
  if(!el) return;
  if(currentViewMemberId==='u1' || currentAccess()==='Administrador'){ el.style.display='none'; return; }
  el.style.display='flex';
  el.textContent = `Visualizando como ${currentViewMember().name} (${currentViewMember().role} · ${currentAccess()}) — algumas ações estão bloqueadas nesta simulação.`;
}
function initials(name){ return name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function updateTeamSummary(){
  const el = document.getElementById('teamSummary');
  if(!el) return;
  const active = teamMembers.filter(m=>m.status!=='pendente').length;
  const pending = teamMembers.filter(m=>m.status==='pendente').length;
  el.textContent = `${active} pessoa${active!==1?'s':''} com acesso${pending?` · ${pending} convite${pending!==1?'s':''} pendente${pending!==1?'s':''}`:''}`;
}
let tmRoleValue = null;
let tmAccessValue = 'Leitura e registro';
let tmChannelValue = 'email';
const TM_ACCESS_OPTIONS = [
  {value:'Leitura e registro', label:'Leitura e registro'},
  {value:'Editor', label:'Editor'},
  {value:'Administrador', label:'Administrador'},
];
const TM_CHANNEL_OPTIONS = [
  {value:'email', label:'E-mail'},
  {value:'whatsapp', label:'WhatsApp'},
];
function setTmRole(value){
  tmRoleValue = value;
  const el = document.getElementById('tm_role_cs');
  if(el) el.outerHTML = customSelectHTML('tm_role_cs', TEAM_ROLES.map(r=>({value:r, label:r})), value, 'setTmRole');
}
function setTmAccess(value){
  tmAccessValue = value;
  const el = document.getElementById('tm_access_cs');
  if(el) el.outerHTML = customSelectHTML('tm_access_cs', TM_ACCESS_OPTIONS, value, 'setTmAccess');
}
function setTmChannel(value){
  tmChannelValue = value;
  const el = document.getElementById('tm_channel_cs');
  if(el) el.outerHTML = customSelectHTML('tm_channel_cs', TM_CHANNEL_OPTIONS, value, 'setTmChannel');
  updateInviteContactField();
}
function openTeamSheet(){
  renderTeamSheetBody();
}
function renderTeamSheetBody(){
  tmRoleValue = TEAM_ROLES[0];
  tmAccessValue = 'Leitura e registro';
  tmChannelValue = 'email';
  const rows = teamMembers.map(m=>`
    <div class="team-row" style="align-items:flex-start;">
      <div class="team-avatar" style="margin-top:1px;">${initials(m.name)}</div>
      <div style="flex:1;min-width:0;">
        <div class="team-name">${m.name}${m.id===currentViewMemberId?' <span class="tag" style="background:#e7f3ea;color:var(--brand);">visualizando</span>':''}${m.status==='pendente'?' <span class="tag" style="background:#fff3de;color:#8a6a12;">convite pendente</span>':''}</div>
        <div class="team-role">${m.role} · ${m.access}${m.contact?`<br>${m.channel==='whatsapp'?'WhatsApp':'E-mail'}: ${m.contact}`:''}</div>
        ${m.status==='pendente' ? `<div style="margin-top:3px;"><span style="font-size:10.5px;color:var(--brand-dark);font-weight:700;cursor:pointer;" onclick="previewInviteMessage('${m.id}', true)">Ver/reenviar convite ›</span></div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex:0 0 auto;">
        ${(m.status==='pendente' && !(BACKEND_ENABLED && currentAuthUser)) ? `<button class="icon-btn-sm" title="Simular aceite do convite" onclick="simulateAcceptInvite('${m.id}')">✓</button>` : ''}
        ${m.fixed ? '' : `<button class="icon-btn-sm" title="Remover" onclick="removeTeamMember('${m.id}')">✕</button>`}
      </div>
    </div>`).join('');
  openSheet('Equipe e permissões', `
    <div style="margin-bottom:6px;">${rows}</div>
    <div class="h-eyebrow" style="padding:8px 0 4px;">Convidar pessoa</div>
    <div class="form-field"><label>Nome</label><input id="tm_name" placeholder="Nome completo"></div>
    <div class="form-row2">
      <div class="form-field"><label>Papel</label>
        ${customSelectHTML('tm_role_cs', TEAM_ROLES.map(r=>({value:r, label:r})), tmRoleValue, 'setTmRole')}
      </div>
      <div class="form-field"><label>Acesso</label>
        ${customSelectHTML('tm_access_cs', TM_ACCESS_OPTIONS, tmAccessValue, 'setTmAccess')}
      </div>
    </div>
    <div class="form-row2">
      <div class="form-field"><label>Canal do convite</label>
        ${customSelectHTML('tm_channel_cs', TM_CHANNEL_OPTIONS, tmChannelValue, 'setTmChannel')}
      </div>
      <div class="form-field"><label id="tm_contact_label">E-mail</label>
        <input id="tm_contact" type="email" placeholder="email@exemplo.com"></div>
    </div>
    <p style="font-size:10.5px;color:var(--ink-muted);margin:2px 0 8px;">A pessoa recebe um link de convite pelo canal escolhido e só passa a ter acesso depois de aceitar.</p>
    <button class="sheet-save" onclick="addTeamMember()">Enviar convite</button>
    <div class="h-eyebrow" style="padding:12px 0 4px;">Simular visualização como</div>
    <p style="font-size:11px;color:var(--ink-muted);margin:0 0 8px;">Escolha uma pessoa da equipe para ver o app com o nível de acesso dela — útil para testar o que cada papel pode fazer.</p>
    <div class="form-field">${customSelectHTML('tm_viewas_cs', teamMembers.filter(m=>m.status!=='pendente').map(m=>({value:m.id, label:`${m.name} — ${m.access}`})), currentViewMemberId, 'setCurrentViewMember')}</div>
  `);
}
function updateInviteContactField(){
  const label = document.getElementById('tm_contact_label');
  const input = document.getElementById('tm_contact');
  if(!label || !input) return;
  if(tmChannelValue==='whatsapp'){ label.textContent='WhatsApp'; input.type='tel'; input.placeholder='(11) 99999-9999'; }
  else { label.textContent='E-mail'; input.type='email'; input.placeholder='email@exemplo.com'; }
}
// Monta o texto do convite e dispara o envio de verdade: abre o WhatsApp
// (wa.me) com a mensagem já pronta no campo — falta só a pessoa tocar em
// enviar, que é o jeito padrão e gratuito de abrir uma conversa de
// WhatsApp a partir de um site (não precisa de nenhuma conta paga). Para
// e-mail, abre o programa de e-mail do usuário (mailto:) já preenchido.
// O link agora aponta pra de verdade — o site publicado do AGROOP — em vez
// do domínio fictício "agroop.app" que nunca existiu e não podia ser aberto.
function inviteMessageFor(m){
  const meta = (currentAuthUser && currentAuthUser.user_metadata) || {};
  const inviterName = (meta.nickname && meta.nickname.trim()) || meta.full_name || 'Um produtor do AGROOP';
  const farmNames = Object.values(farms).map(f=>f.name).join(', ');
  const farmPart = farmNames ? ` em ${farmNames}` : '';
  const link = `${AGROOP_SITE_URL}/?invite=${m.code || inviteCodeFor(m)}`;
  return `AGROOP — ${inviterName} te convidou para acessar o app como ${m.role} (${m.access})${farmPart}. Toque para aceitar: ${link}`;
}
// Retrocompatibilidade para membros de demonstração sem código salvo no banco.
function inviteCodeFor(m){ return 'AG-' + m.id.toUpperCase(); }
function sendInviteForReal(id){
  const m = teamMembers.find(x=>x.id===id);
  if(!m) return;
  const msgText = inviteMessageFor(m);
  if(m.channel==='whatsapp'){
    let digits = (m.contact||'').replace(/\D/g,'');
    if(digits && !digits.startsWith('55') && digits.length<=11) digits = '55'+digits;
    if(!digits){ showToast('Informe um número de WhatsApp válido para enviar'); return; }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msgText)}`, '_blank');
    showToast('Abrindo o WhatsApp com o convite pronto para enviar…');
  } else {
    const subject = encodeURIComponent('Você foi convidado para o AGROOP');
    window.location.href = `mailto:${encodeURIComponent(m.contact||'')}?subject=${subject}&body=${encodeURIComponent(msgText)}`;
    showToast('Abrindo seu app de e-mail com o convite pronto para enviar…');
  }
}
function previewInviteMessage(id, isResend){
  const m = teamMembers.find(x=>x.id===id);
  if(!m) return;
  const msgText = inviteMessageFor(m);
  let previewHTML;
  if(m.channel==='whatsapp'){
    previewHTML = `
      <div style="background:#dcf3d5;border-radius:14px;padding:12px;">
        <div style="font-size:10px;color:#4a4a4a;font-weight:700;display:flex;align-items:center;gap:4px;margin-bottom:6px;">${svgIcon('whatsapp',{size:12})} WhatsApp · para ${m.contact}</div>
        <div style="background:#fff;border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.5;color:#1a1a1a;box-shadow:0 1px 2px rgba(0,0,0,.06);">${msgText}</div>
      </div>`;
  } else {
    previewHTML = `
      <div style="border:1px solid var(--border);border-radius:14px;overflow:hidden;">
        <div style="background:#f4f3ec;padding:10px 12px;font-size:11px;color:var(--ink-2);border-bottom:1px solid var(--border);line-height:1.6;">
          <div><b>De:</b> ${(currentAuthUser && currentAuthUser.email) || 'você'}</div>
          <div><b>Para:</b> ${m.contact}</div>
          <div><b>Assunto:</b> Você foi convidado para o AGROOP</div>
        </div>
        <div style="padding:12px;font-size:12px;line-height:1.5;color:var(--ink);">${msgText}</div>
      </div>`;
  }
  openSheet('Convite', `
    <p style="font-size:11px;color:var(--ink-muted);margin:0 0 10px;">É assim que a mensagem chega para ${m.name}. Toque em "Enviar" para abrir o ${m.channel==='whatsapp'?'WhatsApp':'seu e-mail'} de verdade, já com o texto pronto.</p>
    ${previewHTML}
    <button class="sheet-save" style="margin-top:14px;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="sendInviteForReal('${m.id}')">${m.channel==='whatsapp' ? svgIcon('whatsapp',{size:14})+' Abrir WhatsApp e enviar' : svgIcon('envelope',{size:14})+' Abrir e-mail e enviar'}</button>
    <button class="fab-btn ghost" style="width:100%;margin-top:8px;justify-content:center;" onclick="renderTeamSheetBody()">‹ Voltar para a equipe</button>
  `);
  if(isResend){
    const channelLabel = m.channel==='whatsapp' ? 'WhatsApp' : 'e-mail';
    registerChange(`Convite reaberto por ${channelLabel} para ${m.contact}`);
  }
}
function simulateAcceptInvite(id){
  const m = teamMembers.find(x=>x.id===id);
  if(!m) return;
  m.status = 'ativo';
  renderTeamSheetBody();
  registerChange(`${m.name} aceitou o convite — acesso liberado`);
}
function setCurrentViewMember(id){
  currentViewMemberId = id;
  updateAccessBanner();
  const m = currentViewMember();
  showToast(`Visualizando como ${m.name} (${m.access})`);
}
async function addTeamMember(){
  if(!requireAccess('Administrador', 'convidar pessoas para a equipe')) return;
  const name = document.getElementById('tm_name').value.trim();
  const channel = tmChannelValue;
  const contact = document.getElementById('tm_contact').value.trim();
  if(!name){ showToast('Informe o nome da pessoa'); return; }
  if(!contact){ showToast(channel==='whatsapp' ? 'Informe o WhatsApp da pessoa' : 'Informe o e-mail da pessoa'); return; }
  const role = tmRoleValue;
  const access = tmAccessValue;

  let member;
  let pendingSync = false;
  if(BACKEND_ENABLED && currentAuthUser){
    if(!navigator.onLine){
      pendingSync = true;
    } else {
      try{
        member = await createRealInvite({name, role, access, channel, contact});
      }catch(e){
        if(looksLikeNetworkError(e)) pendingSync = true;
        else { showToast('Não foi possível criar o convite agora.'); return; }
      }
      if(!member && !pendingSync) return; // erro de aplicação já mostrado dentro de createRealInvite
    }
    if(pendingSync){
      const tempId = 'inv_local_'+newId('');
      member = { id: tempId, code: generateInviteCode(), name, role, access, channel, contact, status:'pendente', pendingSync:true };
      teamMembers.push(member);
      enqueueSyncOp('invite', 'insert', { tempId, name, role, access, channel, contact });
    } else {
      teamMembers.push(member);
    }
  } else {
    const id = newId('u');
    member = {id, code: generateInviteCode(), name, role, access, channel, contact, status:'pendente'};
    teamMembers.push(member);
  }
  updateTeamSummary();
  const channelLabel = channel==='whatsapp' ? 'WhatsApp' : 'e-mail';
  if(pendingSync){
    showToast(`Sem conexão — convite pra ${name} salvo no aparelho e será enviado quando a internet voltar.`);
    refreshSyncUI();
  } else {
    registerChange(`Convite criado por ${channelLabel} para ${contact} — aguardando aceite de ${name}`);
  }
  previewInviteMessage(member.id);
}
// Cria o convite de verdade no Supabase (tabela account_invites) e devolve
// o membro já com o código real gerado pelo banco. Se a tabela ainda não
// existir (SQL não rodado), avisa a pessoa em vez de travar silenciosamente.
// Um erro de conexão de verdade é relançado (throw) pro chamador decidir
// guardar offline, em vez de virar um toast de erro genérico aqui.
async function createRealInvite({name, role, access, channel, contact}, opts){
  const silent = opts && opts.silent;
  for(let attempt=0; attempt<3; attempt++){
    const code = generateInviteCode();
    const { data, error } = await sb.from('account_invites').insert({
      owner_id: currentAuthUser.id, code, invited_name: name, role, access, channel, contact,
    }).select().single();
    if(!error && data){
      return { id:'inv_'+data.id, inviteId: data.id, code: data.code, name, role, access, channel, contact, status:'pendente' };
    }
    if(error){
      if(looksLikeNetworkError(error)) throw error;
      if(error.code !== '23505'){ // não é colisão de código único — outro problema
        if(!silent) showToast('Não foi possível criar o convite agora. Verifique se o banco de dados já foi configurado.');
        return null;
      }
      // colisão de código (rara) — tenta de novo com outro código
    }
  }
  if(!silent) showToast('Não foi possível gerar um convite agora. Tente de novo.');
  return null;
}
async function removeTeamMember(id){
  if(!requireAccess('Administrador', 'remover pessoas da equipe')) return;
  const m = teamMembers.find(x=>x.id===id);
  if(!m) return;
  if(m.pendingSync){
    // Convite ainda nem chegou a existir no servidor (foi criado offline) —
    // só tira da fila em vez de tentar apagar algo que não existe lá.
    syncQueue = syncQueue.filter(op => !(op.entity==='invite' && op.payload && op.payload.tempId===id));
    saveSyncQueueToStorage();
    refreshSyncUI();
  } else if(BACKEND_ENABLED && currentAuthUser){
    try{
      if(m.inviteId){ await sb.from('account_invites').delete().eq('id', m.inviteId); }
      else if(m.memberId){ await sb.from('account_members').delete().eq('owner_id', currentAuthUser.id).eq('member_id', m.memberId); }
    }catch(e){ /* segue removendo da tela mesmo se a limpeza no banco falhar */ }
  }
  teamMembers = teamMembers.filter(x=>x.id!==id);
  if(currentViewMemberId===id) currentViewMemberId = 'u1';
  updateTeamSummary();
  renderTeamSheetBody();
  registerChange(`${m.name} removido(a) da equipe`);
}

function openSyncSheet(){
  renderSyncSheetBody();
}
function renderSyncSheetBody(){
  const statusLabel = document.getElementById('syncLabel') ? document.getElementById('syncLabel').textContent : 'Sincronizado';
  const n = pendingQueueCount();
  openSheet('Sincronização', `
    <div class="card" style="margin:0 0 12px;">
      <div class="kv-row"><span class="k">Status atual</span><span class="v">${statusLabel}</span></div>
      <div class="kv-row"><span class="k">Registros pendentes</span><span class="v">${n}</span></div>
      <div class="kv-row"><span class="k">Conexão</span><span class="v">${navigator.onLine ? 'Online' : 'Sem internet'}</span></div>
    </div>
    <p style="font-size:11.5px;color:var(--ink-2);line-height:1.5;margin:0 0 12px;">
      O app funciona mesmo sem internet no campo: propriedades e convites cadastrados offline ficam guardados no aparelho e são enviados pro servidor sozinhos assim que a conexão voltar. O clima em tempo real precisa de internet.
    </p>
    ${n>0
      ? `<button class="sheet-save" onclick="trySyncQueue(true); renderSyncSheetBody();">Sincronizar agora</button>`
      : `<p style="font-size:11.5px;color:var(--ink-muted);text-align:center;margin:0;">Tudo sincronizado — nenhum registro pendente.</p>`}
  `);
}

let climateSourcePref = 'openmeteo';
const CLIMATE_SOURCES = [
  {id:'openmeteo', name:'Open-Meteo', desc:'Fonte pública usada em tempo real pelo AGROOP — sem necessidade de chave de API.'},
  {id:'inmet', name:'INMET / SISDAGRO', desc:'Fonte oficial brasileira — previsão, balanço hídrico e produtos agroclimáticos.'},
  {id:'zarc', name:'ZARC (MAPA)', desc:'Janelas de plantio por município, cultura, solo e ciclo — usado como critério agronômico, não como clima em si.'},
  {id:'google', name:'Google Weather API', desc:'Requer chave paga com faturamento — só viável com um back-end protegendo a chave (fase Flutter + Firebase).'},
];
function openClimateSourceSheet(){
  renderClimateSourceBody();
}
function renderClimateSourceBody(){
  const rows = CLIMATE_SOURCES.map(s=>`
    <div class="radio-row" onclick="setClimateSource('${s.id}')">
      <div class="radio-dot ${climateSourcePref===s.id?'sel':''}"></div>
      <div><div class="team-name">${s.name}</div><div class="team-role">${s.desc}</div></div>
    </div>`).join('');
  openSheet('Fontes climáticas', `
    <p style="font-size:11.5px;color:var(--ink-2);line-height:1.5;margin:0 0 6px;">Fonte usada como prioritária para o clima do app. A busca ao vivo sempre usa Open-Meteo — as demais ficam disponíveis como referência agronômica complementar.</p>
    ${rows}
  `);
}
function setClimateSource(id){
  climateSourcePref = id;
  const s = CLIMATE_SOURCES.find(x=>x.id===id);
  document.getElementById('climateSourceSummary').textContent = s.name + (id==='openmeteo' ? ' (tempo real)' : ' (preferência definida)');
  renderClimateSourceBody();
  registerChange('Fonte climática preferida: ' + s.name);
}

let notifPrefs = {
  'Lembrete antecipado de atividade': true,
  'Confirmação no dia da operação': true,
  'Mudança de condição climática': true,
  'Condição desfavorável para o horário agendado': true,
  'Nova janela favorável prevista': true,
  'Atividade atrasada ou não concluída': true,
  'Mensagem de início de plantio ou safra': true,
};
function updateNotifPrefsSummary(){
  const total = Object.keys(notifPrefs).length;
  const on = Object.values(notifPrefs).filter(Boolean).length;
  const el = document.getElementById('notifPrefsSummary');
  if(el) el.textContent = `${on} de ${total} ativas`;
}
function openNotifPrefsSheet(){
  renderNotifPrefsBody();
}
function renderNotifPrefsBody(){
  const rows = Object.keys(notifPrefs).map(k=>`
    <div class="toggle-row">
      <span class="tlabel">${k}</span>
      <button class="toggle-sw ${notifPrefs[k]?'on':''}" onclick="toggleNotifPref('${k.replace(/'/g,"\\'")}')"><span class="knob"></span></button>
    </div>`).join('');
  openSheet('Preferências de notificação', `<div>${rows}</div><p style="font-size:11px;color:var(--ink-muted);margin-top:10px;">A Central de Notificações interna é sempre obrigatória — estas chaves controlam apenas quais tipos de aviso ela gera.</p>`);
}
function toggleNotifPref(key){
  notifPrefs[key] = !notifPrefs[key];
  updateNotifPrefsSummary();
  renderNotifPrefsBody();
}

// Contato real do suporte AGROOP. Ajuste aqui se o e-mail/telefone mudar.
const SUPPORT_WHATSAPP = '5566996263149'; // 66 99626-3149, com DDI 55 (Brasil) p/ o link wa.me
const SUPPORT_WHATSAPP_DISPLAY = '(66) 99626-3149';
const SUPPORT_EMAIL = 'luizhenriquesouza5432@gmail.com';
function openSupportSheet(){
  openSheet('Suporte', `
    <p style="font-size:12px;color:var(--ink-2);line-height:1.5;margin:0 0 14px;">Precisa de ajuda com o AGROOP? Escolha um canal abaixo.</p>
    <button class="fab-btn" style="width:100%;justify-content:center;margin-bottom:8px;" onclick="window.open('https://wa.me/${SUPPORT_WHATSAPP}?text='+encodeURIComponent('Olá! Preciso de ajuda com o AGROOP.'),'_blank')">${svgIcon('whatsapp',{size:14})} Falar no WhatsApp</button>
    <button class="fab-btn ghost" style="width:100%;justify-content:center;margin-bottom:8px;" onclick="window.location.href='mailto:${SUPPORT_EMAIL}?subject=Suporte%20AGROOP'">${svgIcon('envelope',{size:14})} Enviar e-mail</button>
    <div class="card" style="margin-top:10px;">
      <div class="kv-row"><span class="k">WhatsApp</span><span class="v">${SUPPORT_WHATSAPP_DISPLAY}</span></div>
      <div class="kv-row"><span class="k">E-mail</span><span class="v">${SUPPORT_EMAIL}</span></div>
      <div class="kv-row"><span class="k">Horário de atendimento</span><span class="v">Seg–Sex, 8h–18h</span></div>
      <div class="kv-row"><span class="k">Tempo médio de resposta</span><span class="v">até 4h úteis</span></div>
    </div>
  `);
}

function openAboutSheet(){
  openSheet('Sobre o AGROOP', `
    <div class="card" style="margin:0 0 12px;">
      <div class="kv-row"><span class="k">Desenvolvido por</span><span class="v">BHASA Sistemas</span></div>
      <div class="kv-row"><span class="k">Versão</span><span class="v">${AGROOP_VERSION}</span></div>
      <div class="kv-row"><span class="k">Lançamento</span><span class="v">${AGROOP_LAUNCH_DATE}</span></div>
    </div>
    <div class="h-eyebrow" style="padding:0 0 6px;">Fontes de dados oficiais</div>
    <div class="card" style="line-height:1.9;font-size:11.5px;">
      <a href="https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico/zoneamento-agricola" target="_blank" style="display:block;color:var(--brand-dark);">MAPA — Zoneamento Agrícola de Risco Climático ↗</a>
      <a href="https://www.gov.br/agricultura/pt-br/assuntos/riscos-seguro/programa-nacional-de-zoneamento-agricola-de-risco-climatico/plantio-certo" target="_blank" style="display:block;color:var(--brand-dark);">MAPA — Aplicativo ZARC Plantio Certo ↗</a>
      <a href="https://portal.inmet.gov.br/servicos/sisdagro" target="_blank" style="display:block;color:var(--brand-dark);">INMET — SISDAGRO ↗</a>
    </div>
  `);
}

// ---------------------------------------------------------------
// INIT
// ---------------------------------------------------------------
// Relógio da barra de status e a saudação ("Bom dia/Boa tarde/Boa noite") usam a
// hora real do aparelho — são "chrome" do app, não dado do prototípo (que continua
// fixado em APP_TODAY para a agenda/atividades fazerem sentido como demonstração).
function updateStatusClockAndGreeting(){
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const clockEl = document.getElementById('statusClock');
  if(clockEl) clockEl.textContent = `${hh}:${mm}`;
  const h = now.getHours();
  let greeting = h>=5 && h<12 ? 'Bom dia' : h>=12 && h<18 ? 'Boa tarde' : 'Boa noite';
  if(isUserBirthdayToday()) greeting = 'Feliz aniversário';
  const greetEl = document.getElementById('greetText');
  if(greetEl) greetEl.textContent = greeting;
}
updateStatusClockAndGreeting();
setInterval(updateStatusClockAndGreeting, 30000);

renderHome();
renderHomeWeatherSelect();
renderWeatherCard('homeWeatherCard', homeWeatherFarmId);
renderDesktopWeatherCard(homeWeatherFarmId);
renderPropFilters();
renderPropertiesList();
renderActivitiesFilters();
renderActivitiesList();
renderNotifications();
renderReports();
fetchAllFarmsWeather();
updateTeamSummary();
updateNotifPrefsSummary();
updateFieldRecordsSummary();
updateAccessBanner();
refreshSyncUI();
initAuthGate();
initNativeAuthCallback();

// Registra o service worker que deixa o app abrir mesmo sem internet no
// campo (guarda o "esqueleto" do app no aparelho na primeira visita online).
//
// Importante: como ele guarda HTML/CSS/JS em cache, sem o código abaixo
// quem já tinha o app aberto continuaria vendo uma versão antiga (com bugs
// já corrigidos) até fechar e abrir o app de novo do zero — foi exatamente
// isso que causou o modo escuro parecer "não corrigido" depois de já
// termos corrigido. Agora, assim que existe uma versão nova publicada, o
// app troca pra ela sozinho e recarrega a tela automaticamente.
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    // Se a página já abriu SEM nenhum service worker controlando ela ainda
    // (primeira instalação — nunca tinha nada em cache antes), não existe
    // "versão antiga" nenhuma pra render recarregar por cima: é só deixar
    // registrar e a própria tela de carregamento (boot screen) seguir seu
    // tempo normal. Sem essa checagem, o "clients.claim()" do sw.js dispara
    // um controllerchange quase instantâneo mesmo numa instalação nova, e
    // a página recarregava sozinha bem no meio da animação de carregamento
    // — cortando ela e dando a impressão de abrir "rápido demais"/errado.
    const hadControllerBefore = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((reg)=>{
      reg.update().catch(()=>{});
      if(!hadControllerBefore) return;
      let alreadyRefreshed = false;
      navigator.serviceWorker.addEventListener('controllerchange', ()=>{
        if(alreadyRefreshed) return;
        alreadyRefreshed = true;
        location.reload();
      });
    }).catch(()=>{ /* navegador sem suporte ou bloqueado — segue sem offline completo */ });
  });
}
