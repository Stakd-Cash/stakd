import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore.js';
import { useModalClose } from '../hooks/useModalClose.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

function UpsellSheet({ onClose }) {
  const [closing, triggerClose] = useModalClose(200);
  const focusRef = useFocusTrap(true);
  const [copied, setCopied] = useState(false);

  const close = useCallback(() => triggerClose(onClose), [triggerClose, onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText('stakd.cash').then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: 'stakd',
        text: 'Check out stakd for managing your store\'s cash drops.',
        url: 'https://stakd.cash',
      }).catch(() => {});
    } else {
      handleCopy();
    }
  }, [handleCopy]);

  return (
    <div
      className={`sk-backdrop${closing ? ' sk-modal-closing' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Sync your drops"
    >
      <div className="free-upsell-sheet" ref={focusRef} onClick={(e) => e.stopPropagation()}>
        <button className="free-upsell-close" onClick={close} aria-label="Close">
          <i className="fa-solid fa-xmark icon-18" />
        </button>
        <div className="free-upsell-body">
          <h2 className="free-upsell-title">
            stakd saves your whole team&apos;s drops — automatically.
          </h2>
          <p className="free-upsell-text">
            Managers get real-time visibility, variance alerts, and full drop
            history across every cashier. Ask your manager to set up stakd for your store.
          </p>
          <div className="free-upsell-link-row">
            <span className="free-upsell-url">stakd.cash</span>
            <button className="free-upsell-copy" onClick={handleCopy}>
              {copied ? (
                <><i className="fa-solid fa-check" /> Copied</>
              ) : (
                <><i className="fa-solid fa-copy" /> Copy</>
              )}
            </button>
          </div>
          <button className="free-upsell-share" onClick={handleShare}>
            <i className="fa-solid fa-share-nodes" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestKioskFooter() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="kiosk-footer kiosk-footer--guest">
        <span>Your drops are saved on this device only.</span>
        {' '}
        <button
          type="button"
          className="kiosk-footer-cta"
          onClick={() => setSheetOpen(true)}
        >
          Show your manager →
        </button>
      </div>
      {sheetOpen && <UpsellSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}

function StaffKioskFooter() {
  const company = useAuthStore((s) => s.company);
  if (!company?.name) return null;
  return (
    <div className="kiosk-footer kiosk-footer--staff">
      <span>Drops sync to {company.name}.</span>
    </div>
  );
}

export function KioskFooter({ variant }) {
  if (variant === 'staff') {
    return <StaffKioskFooter />;
  }
  return <GuestKioskFooter />;
}
