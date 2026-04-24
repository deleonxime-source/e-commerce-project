import { useEffect, useState } from 'react';

function ensureStrataWidget() {
  const scriptId = 'strata-widget-script';
  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://strata.fyi/widget.js';
    script.defer = true;
    document.body.appendChild(script);
  }

  if (!document.querySelector('strata-chat')) {
    const widget = document.createElement('strata-chat');
    widget.setAttribute('workspace', 'support-bot');
    document.body.appendChild(widget);
  }
}

function removeStrataWidget() {
  const selectors = [
    'strata-chat',
    '.strata-chat-widget',
    'iframe[src*="strata.fyi/embed"]',
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => node.remove());
  });
}

/**
 * Floating launcher for the Strata support widget (CSS in App.css: `.ai-agent-launcher`, etc.).
 */
export function StrataChatLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (document.querySelector('strata-chat')) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return;

      removeStrataWidget();
      setIsOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function closeAgent() {
    removeStrataWidget();
    setIsOpen(false);
  }

  function toggleAgent() {
    if (document.querySelector('strata-chat')) {
      closeAgent();
      return;
    }

    ensureStrataWidget();
    setIsOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className={`ai-agent-launcher ${isOpen ? 'ai-agent-launcher--open' : ''}`}
        onClick={toggleAgent}
        aria-label={isOpen ? 'Open AI agent' : 'Open AI agent'}
        title={isOpen ? 'Open AI agent' : 'Open AI agent'}
      >
        <span className="ai-agent-launcher__pulse" aria-hidden="true" />
        <span className="ai-agent-launcher__label">{isOpen ? 'Open AI agent' : 'Open AI agent'}</span>
      </button>

      {isOpen && (
        <button
          type="button"
          className="ai-agent-close"
          onClick={closeAgent}
          aria-label="Close AI agent"
          title="Close AI agent"
        >
          Close AI
        </button>
      )}
    </>
  );
}
