/**
 * Script para extender deadlines de pedidos bloqueados
 * Se ejecuta diariamente via GitHub Actions
 * Cada día que un pedido está bloqueado, su deadline se extiende +1 día
 */

const { createClient } = require('@supabase/supabase-js');
const { addDays, differenceInDays, parseISO } = require('date-fns');

// Variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEAM_ID = process.env.TEAM_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Faltan variables de entorno necesarias');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔄 Extending deadlines for blocked orders...');

  // Fetch all blocked requests
  let query = supabase
    .from('requests')
    .select('id, deadline, blocked_at, original_deadline')
    .eq('status', 'blocked');

  if (TEAM_ID) {
    query = query.eq('team_id', TEAM_ID);
  }

  const { data: blockedRequests, error } = await query;

  if (error) {
    console.error('❌ Error fetching blocked requests:', error);
    process.exit(1);
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

    const blockedAt = parseISO(request.blocked_at);
    const originalDeadline = parseISO(request.original_deadline);
    const daysBlocked = differenceInDays(new Date(), blockedAt);
    const newDeadline = addDays(originalDeadline, daysBlocked);

    // Only update if deadline actually changed
    const currentDeadline = parseISO(request.deadline);
    if (Math.abs(newDeadline.getTime() - currentDeadline.getTime()) < 86400000) {
      continue; // Skip if less than 1 day difference
    }

    const { error: updateError } = await supabase
      .from('requests')
      .update({
        deadline: newDeadline.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id);

    if (updateError) {
      console.error(`❌ Error updating ${request.id}:`, updateError);
    } else {
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
        ...(TEAM_ID && { team_id: TEAM_ID }),
      });
    }
  }

  console.log('✅ Done extending blocked deadlines.');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
