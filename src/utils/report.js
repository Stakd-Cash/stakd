import { formatMoney } from './money.js';

export function buildReport({
  totalCash,
  actualDropTotal,
  remainingDrawer,
  TARGET,
  dropDetails,
}) {
  const lines = [];
  lines.push('stakd Drop Report');
  lines.push('─'.repeat(28));
  lines.push(`Counted:  $${totalCash.toFixed(2)}`);
  lines.push(`Target:   $${TARGET.toFixed(2)}`);
  lines.push(`Drop:     $${actualDropTotal.toFixed(2)}`);
  lines.push(`Remains:  $${remainingDrawer.toFixed(2)}`);
  if (dropDetails.length > 0) {
    lines.push('');
    lines.push('Pull from drawer:');
    dropDetails.forEach((d) =>
      lines.push(`  ${d.count}× ${d.label}  = $${d.value.toFixed(2)}`)
    );
  }
  lines.push('');
  lines.push(
    `Generated ${new Date().toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`
  );
  return lines.join('\n');
}
