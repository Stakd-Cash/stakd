import React from 'react';
import { CollapsibleSection } from './CollapsibleSection.jsx';
import { BillRow, CoinRow } from './BillRow.jsx';
import { BILL_DENOMS, COIN_DENOMS } from '../utils/constants.js';
import { fromCents } from '../utils/money.js';

export function CountPage({
  totalBillsCents,
  totalCoinsCents,
  billsMode,
  coinsMode,
  cash,
  coinRolls,
  handleBillsModeChange,
  handleCoinsModeChange,
  handleManualInput,
  billStep,
  coinStep,
  handleCoinRoll,
  handleCoinRollSet,
  goToResult,
}) {
  return (
    <>
      <CollapsibleSection
        id="bills-card"
        className="calc-section-card admin-table-wrap calc-bills-card"
        label="Bills"
        badge={`$${fromCents(totalBillsCents).toFixed(2)}`}
        mode={billsMode}
        onModeChange={handleBillsModeChange}
        defaultOpen={true}
      >
        <div className="section-body">
          {BILL_DENOMS.map((d) => (
            <BillRow
              key={d}
              id={String(d)}
              label={`$${d}`}
              denom={d}
              inputMode={billsMode}
              value={cash[String(d)]}
              onManualInput={handleManualInput}
              onStep={billStep}
              onEnterKey={goToResult}
            />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="coins-card"
        className="calc-section-card admin-table-wrap calc-coins-card"
        label="Coins"
        badge={`$${fromCents(totalCoinsCents).toFixed(2)}`}
        mode={coinsMode}
        onModeChange={handleCoinsModeChange}
        defaultOpen={false}
      >
        <div className="section-body">
          {COIN_DENOMS.map((c) => (
            <CoinRow
              key={c.id}
              id={c.id}
              label={c.label}
              denom={c.val}
              rollCount={c.roll}
              rolls={coinRolls[c.id]}
              onRoll={handleCoinRoll}
              onRollSet={handleCoinRollSet}
              inputMode={coinsMode}
              value={cash[c.id]}
              onManualInput={handleManualInput}
              onStep={coinStep}
              onEnterKey={goToResult}
            />
          ))}
        </div>
      </CollapsibleSection>

      <div className="hold-hint login-subtitle">
        Tap input to type and hold +/- to repeat
      </div>
    </>
  );
}
