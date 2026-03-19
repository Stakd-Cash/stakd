import React, { useState, useEffect } from 'react';
import { useModalClose } from '../hooks/useModalClose.js';
import { haptic } from '../utils/haptics.js';
import { lsSet } from '../utils/storage.js';
import { GH_COMMITS_URL, GH_CACHE_KEY, GH_CACHE_TTL, LS_CHANGELOG } from '../utils/constants.js';

function getCachedCommit() {
  try {
    const raw = localStorage.getItem(GH_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > GH_CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedCommit(data) {
  try {
    localStorage.setItem(
      GH_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    /* swallow */
  }
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const out = [];
  let listBuf = [];
  let key = 0;

  const flushList = () => {
    if (!listBuf.length) return;
    out.push(
      <ul key={key++} className="cl-md-list">
        {listBuf.map((l, i) => (
          <li key={i}>{inlineRender(l)}</li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  const inlineRender = (str) => {
    const parts = [];
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~)/g;
    let last = 0;
    let m;
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index));
      if (m[2] !== undefined)
        parts.push(<strong key={m.index}>{m[2]}</strong>);
      else if (m[3] !== undefined)
        parts.push(<em key={m.index}>{m[3]}</em>);
      else if (m[4] !== undefined)
        parts.push(
          <code key={m.index} className="cl-md-code">
            {m[4]}
          </code>
        );
      else if (m[5] !== undefined)
        parts.push(<s key={m.index}>{m[5]}</s>);
      last = m.index + m[0].length;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts.length === 1 && typeof parts[0] === 'string'
      ? parts[0]
      : parts;
  };

  for (const line of lines) {
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    const lm = line.match(/^[-*]\s+(.*)/);
    const empty = line.trim() === '';
    if (hm) {
      flushList();
      const Tag = `h${hm[1].length + 2}`;
      out.push(
        <Tag key={key++} className="cl-md-heading">
          {inlineRender(hm[2])}
        </Tag>
      );
    } else if (lm) {
      listBuf.push(lm[1]);
    } else if (empty) {
      flushList();
    } else {
      flushList();
      out.push(
        <p key={key++} className="cl-md-p">
          {inlineRender(line)}
        </p>
      );
    }
  }
  flushList();
  return out.length ? out : null;
}

export function ChangelogModal({ onClose }) {
  const [closing, triggerClose] = useModalClose(200);
  const [commit, setCommit] = useState(null);
  const [err, setErr] = useState(false);
  const [showAgain, setShowAgain] = useState(true);

  useEffect(() => {
    const cached = getCachedCommit();
    if (cached) {
      setCommit(cached);
      return;
    }
    const load = () => {
      fetch(GH_COMMITS_URL, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      })
        .then((r) => {
          if (!r.ok) throw new Error('fetch failed');
          return r.json();
        })
        .then((data) => {
          if (!data || !data[0]) throw new Error('empty');
          const c = data[0];
          const parsed = {
            sha: c.sha.slice(0, 7),
            fullSha: c.sha,
            msg: c.commit.message.split('\n')[0],
            body:
              c.commit.message.split('\n').slice(2).join('\n').trim() || null,
            date: new Date(c.commit.author.date).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
          };
          setCachedCommit(parsed);
          setCommit(parsed);
        })
        .catch(() => setErr(true));
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(load, { timeout: 2000 });
    } else {
      setTimeout(load, 100);
    }
  }, []);

  const handleClose = () => {
    triggerClose(() => {
      if (commit) lsSet(LS_CHANGELOG, { sha: commit.fullSha, showAgain });
      onClose();
    });
  };

  return (
    <div
      className={`modal-backdrop${closing ? ' modal-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="changelog-card" onClick={(e) => e.stopPropagation()}>
        <div className="changelog-header">
          <div className="changelog-icon-row">
            <div className="changelog-logo">
              <img
                src="/favicon.png"
                alt=""
                decoding="async"
                loading="lazy"
              />
            </div>
            <div>
              <div className="changelog-title">What&apos;s New</div>
              <div className="changelog-subtitle">
                Latest update · stakd
              </div>
            </div>
          </div>
        </div>
        <div className="changelog-body">
          {err ? (
            <div className="changelog-error">
              <div className="changelog-error-icon">
                <i className="fa-solid fa-xmark icon-22" />
              </div>
              <div>Couldn&apos;t load changelog.</div>
              <div className="changelog-error-sub">
                Check your connection and try again.
              </div>
            </div>
          ) : !commit ? (
            <div className="changelog-loading">
              <div className="changelog-spinner" />
              <span>Fetching update…</span>
            </div>
          ) : (
            <div className="changelog-commit">
              <div className="changelog-commit-msg">{commit.msg}</div>
              {commit.body && (
                <div className="changelog-commit-body">
                  {renderMarkdown(commit.body)}
                </div>
              )}
              <div className="changelog-commit-meta">
                <span className="changelog-sha">{commit.sha}</span>
                <span className="changelog-date">{commit.date}</span>
                <span className="changelog-latest-badge">Latest</span>
              </div>
            </div>
          )}
        </div>
        <div className="changelog-footer">
          <div className="changelog-hide-row">
            <input
              id="cl-show"
              type="checkbox"
              className="changelog-checkbox"
              checked={showAgain}
              onChange={(e) => setShowAgain(e.target.checked)}
            />
            <label htmlFor="cl-show" className="changelog-hide-label">
              Notify me again when there&apos;s a new update
            </label>
          </div>
          <button
            className="changelog-close-btn"
            onClick={() => {
              haptic('tap');
              handleClose();
            }}
            type="button"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
