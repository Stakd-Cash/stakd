import React from 'react';
import {
  LS_HISTORY,
  LS_SETTINGS,
  LS_TUTORIAL,
  LS_RECORD,
  LS_THEME,
  LS_HINT,
  LS_CHANGELOG,
} from '../utils/constants.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    try {
      console.error(err);
    } catch {
      /* swallow */
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      const KEEP = [
        LS_HISTORY,
        LS_SETTINGS,
        LS_TUTORIAL,
        LS_RECORD,
        LS_THEME,
        LS_HINT,
        LS_CHANGELOG,
      ];
      const saved = {};
      for (const k of KEEP) {
        const v = localStorage.getItem(k);
        if (v != null) saved[k] = v;
      }
      localStorage.clear();
      for (const [k, v] of Object.entries(saved)) {
        localStorage.setItem(k, v);
      }
    } catch {
      /* swallow */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="error-boundary">
        <div className="error-card">
          <div className="error-title">Something went wrong</div>
          <div className="error-body">
            The app hit an unexpected error. You can reload, or clear local data
            and try again.
          </div>
          <div className="error-actions">
            <button className="error-btn" onClick={this.handleReload}>
              Reload
            </button>
            <button
              className="error-btn danger"
              onClick={this.handleReset}
            >
              Clear Data &amp; Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
