/**
 * Script para extender deadlines de pedidos bloqueados
 * Se ejecuta diariamente via GitHub Actions
 * Cada día que un pedido está bloqueado, su deadline se extiende +1 día
 */

const { createClient } = require('@supabase/supabase-js');
const { addDays, parseISO } = require('date-fns');
const { daysSinceLimaTimestamp } = require('./_dateUtils');
const { notifyCronFailure } = require('./_notify');

// Variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEAM_ID = process.env.TEAM_ID;

// TEAM_ID obligatorio: sin él, el filtro se omitía y el script tocaba pedidos de todos los teams.
if (!SUPABASE_URL || !SUPABASE_KEY || !TEAM_ID) {
  console.error('❌ Error: Faltan variables de entorno necesarias (incluyendo TEAM_ID)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔄 Extending deadlines for blocked orders...');

  const { data: blockedRequests, error } = await supabase
    .from('requests')
    .select('id, deadline, blocked_at, original_deadline')
    .eq('team_id', TEAM_ID)
    .eq('status', 'blocked');

  if (error) {
    throw new Error(`Error fetching blocked requests: ${error.message}`);
  }

  if (!blockedRequests || blockedRequests.length === 0) {
    console.log('✅ No blocked requests found.');
    return;
  }

  console.log(`📋 Found ${blockedRequests.length} blocked request(s)`);

  for (const request of blockedRequests) {
    if (!request.blocked_at || !request.original_deadline) {
      console.log(`⚠️ Skipping ${request.id} - missing blocked_at or original_deadline`);
      continue;
    }

    const originalDeadline = parseISO(request.original_deadline);
    const daysBlocked = daysSinceLimaTimestamp(request.blocked_at);
    const newDeadline = addDays(originalDeadline, daysBlocked);

    // Only update if deadline actually changed (>1 day)
    const currentDeadline = parseISO(request.deadline);
    if (Math.abs(newDeadline.getTime() - currentDeadline.getTime()) < 86400000) {
      continue;
    }

    const { error: updateError } = await supabase
      .from('requests')
      .update({
        deadline: newDeadline.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)
      .eq('team_id', TEAM_ID);

    if (updateError) {
      console.error(`❌ Error updating ${request.id}:`, updateError);
      continue;
    }

    console.log(`✅ Extended deadline for ${request.id}: +${daysBlocked} days`);

    // Log activity
    await supabase.from('activity_log').insert({
      request_id: request.id,
      action: 'deadline_changed',
      details: {
        old_deadline: request.deadline,
        new_deadline: newDeadline.toISOString(),
        reason: `Auto-extended due to ${daysBlocked} day(s) blocked`,
      },
      team_id: TEAM_ID,
    });
  }

  console.log('✅ Done extending blocked deadlines.');
}

main().catch(async (err) => {
  console.error('❌ Fatal error:', err);
  await notifyCronFailure('extend-blocked-deadlines', err);
  process.exit(1);
});
