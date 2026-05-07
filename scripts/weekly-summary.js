/**
 * Script de resumen semanal para el bot de Telegram
 * Se ejecuta los viernes a las 3PM Lima (20:00 UTC) via GitHub Actions
 * Envía un resumen de la semana: pedidos completados y pendientes
 */

const { createClient } = require('@supabase/supabase-js');
const { startOfWeek, endOfWeek, format } = require('date-fns');
const { es } = require('date-fns/locale');
const { daysUntilLimaDate } = require('./_dateUtils');
const { escapeMd } = require('./_telegramMarkdown');
const { notifyCronFailure } = require('./_notify');

// Variables de entorno (configuradas en GitHub Secrets)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TEAM_ID = process.env.TEAM_ID;

// TEAM_ID obligatorio: sin él, el filtro se omitía y el script veía datos de todos los teams.
if (!SUPABASE_URL || !SUPABASE_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !TEAM_ID) {
  console.error('❌ Error: Faltan variables de entorno necesarias (incluyendo TEAM_ID)');
  process.exit(1);
}

// Cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// API de Telegram
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Frases motivacionales para el fin de semana
const WEEKEND_PHRASES = [
  "¡Excelente trabajo esta semana! Disfruten el fin de semana. 🎉",
  "¡Semana productiva! Es hora de recargar energías. 💪",
  "¡Buen cierre de semana! A descansar y volver con todo el lunes. 🚀",
  "¡Feliz fin de semana, equipo! Se lo han ganado. ⭐",
  "¡Otra semana conquistada! Disfruten el descanso. 🌟",
  "¡Gran esfuerzo esta semana! El fin de semana es su recompensa. 🏆",
  "¡Cerramos bien! Ahora a disfrutar el merecido descanso. 😎",
  "¡Semana completada con éxito! A recargar pilas. 🔋",
];

function getRandomWeekendPhrase() {
  return WEEKEND_PHRASES[Math.floor(Math.random() * WEEKEND_PHRASES.length)];
}

async function sendTelegramMessage(text) {
  const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error sending Telegram message: ${error}`);
  }

  return response.json();
}

function formatDaysLeft(deadline) {
  const daysLeft = daysUntilLimaDate(deadline);

  if (daysLeft < 0) return `⚠️ Atrasado ${Math.abs(daysLeft)} día(s)`;
  if (daysLeft === 0) return '⚠️ Vence HOY';
  if (daysLeft === 1) return 'Vence mañana';
  if (daysLeft === 2) return 'Vence el lunes';
  return `${daysLeft} días`;
}

async function main() {
  console.log('📊 Iniciando resumen semanal...');

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Lunes
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Domingo

  // Obtener pedidos completados esta semana
  const { data: completedThisWeek, error: completedError } = await supabase
    .from('requests')
    .select('*')
    .eq('team_id', TEAM_ID)
    .eq('status', 'completed')
    .gte('completed_at', weekStart.toISOString())
    .lte('completed_at', weekEnd.toISOString())
    .order('completed_at', { ascending: false });

  if (completedError) {
    throw new Error(`Error fetching completed requests: ${completedError.message}`);
  }

  // Obtener pedidos pendientes
  const { data: pendingRequests, error: pendingError } = await supabase
    .from('requests')
    .select('*')
    .eq('team_id', TEAM_ID)
    .not('status', 'in', '("completed","cancelled")')
    .order('deadline', { ascending: true });

  if (pendingError) {
    throw new Error(`Error fetching pending requests: ${pendingError.message}`);
  }

  // Clasificar pendientes (en hora Lima)
  const overdue = pendingRequests.filter(r => daysUntilLimaDate(r.deadline) < 0);
  const dueNextWeek = pendingRequests.filter(r => {
    const d = daysUntilLimaDate(r.deadline);
    return d >= 0 && d <= 7;
  });
  const dueLater = pendingRequests.filter(r => daysUntilLimaDate(r.deadline) > 7);

  // Construir mensaje
  const weekRange = `${format(weekStart, 'd', { locale: es })} - ${format(weekEnd, 'd \'de\' MMMM', { locale: es })}`;

  let message = `📊 *RESUMEN SEMANAL*\n`;
  message += `Semana del ${weekRange}\n\n`;

  // Sección: Completados esta semana
  message += `✅ *COMPLETADOS ESTA SEMANA* (${completedThisWeek.length})\n`;
  if (completedThisWeek.length === 0) {
    message += `   No se completaron pedidos esta semana.\n\n`;
  } else {
    completedThisWeek.slice(0, 8).forEach(req => {
      const desc = req.description.substring(0, 40) + (req.description.length > 40 ? '...' : '');
      message += `   • ${escapeMd(req.client)} - ${escapeMd(desc)}\n`;
    });
    if (completedThisWeek.length > 8) {
      message += `   ... y ${completedThisWeek.length - 8} más\n`;
    }
    message += '\n';
  }

  // Sección: Pendientes
  message += `📋 *PENDIENTES* (${pendingRequests.length})\n\n`;

  // Atrasados
  if (overdue.length > 0) {
    message += `🔴 *Atrasados* (${overdue.length})\n`;
    overdue.forEach(req => {
      message += `   • ${escapeMd(req.client)} - ${formatDaysLeft(req.deadline)}\n`;
    });
    message += '\n';
  }

  // Para la próxima semana
  if (dueNextWeek.length > 0) {
    message += `🟡 *Próxima semana* (${dueNextWeek.length})\n`;
    dueNextWeek.slice(0, 5).forEach(req => {
      message += `   • ${escapeMd(req.client)} - ${formatDaysLeft(req.deadline)}\n`;
    });
    if (dueNextWeek.length > 5) {
      message += `   ... y ${dueNextWeek.length - 5} más\n`;
    }
    message += '\n';
  }

  // Más adelante
  if (dueLater.length > 0) {
    message += `🟢 *Más adelante* (${dueLater.length})\n`;
    dueLater.slice(0, 3).forEach(req => {
      message += `   • ${escapeMd(req.client)} - ${formatDaysLeft(req.deadline)}\n`;
    });
    if (dueLater.length > 3) {
      message += `   ... y ${dueLater.length - 3} más\n`;
    }
    message += '\n';
  }

  // Estadísticas
  message += `---\n`;
  message += `📈 *Esta semana:* ${completedThisWeek.length} completados\n`;
  message += `📉 *Pendientes:* ${pendingRequests.length} (${overdue.length} atrasados)\n\n`;

  // Frase motivacional
  message += getRandomWeekendPhrase();

  // Enviar mensaje
  console.log('📤 Enviando resumen semanal a Telegram...');
  await sendTelegramMessage(message);
  console.log('✅ Resumen semanal enviado exitosamente!');

  // Log resumen
  console.log(`\n📊 Resumen:`);
  console.log(`   - Completados esta semana: ${completedThisWeek.length}`);
  console.log(`   - Pendientes totales: ${pendingRequests.length}`);
  console.log(`   - Atrasados: ${overdue.length}`);
}

main().catch(async (error) => {
  console.error('❌ Error en resumen semanal:', error);
  await notifyCronFailure('weekly-summary', error);
  process.exit(1);
});
