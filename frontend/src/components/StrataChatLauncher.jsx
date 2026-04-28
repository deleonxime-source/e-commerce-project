import { useEffect, useState } from 'react';

function ensureStrataWidget() {
  const scriptId = 'strata-widget-script';

  function appendWidget() {
    if (!document.querySelector('strata-chat')) {
      const widget = document.createElement('strata-chat');
      widget.setAttribute('workspace', 'support-bot');
      widget.setAttribute('title', 'Support');
      widget.setAttribute('intro', 'Hi! How can I help you today?');
      widget.setAttribute(
        'pills',
        '["Where is my order?", "Sizing help", "Return policy"]'
      );
      document.body.appendChild(widget);
    }
  }

  const existingScript =
    document.getElementById(scriptId) ||
    document.querySelector('script[src="https://strata.fyi/widget.js"]');

  if (existingScript) {
    appendWidget();
    return;
  }

  const script = document.createElement('script');
  script.id = scriptId;
  script.src = 'https://strata.fyi/widget.js';
  script.defer = true;
  script.onload = appendWidget;
  document.body.appendChild(script);
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

  const buttonLabel = isOpen ? 'Close Chat' : 'Need Help?';

  return (
    <div className="chat-launcher-dock">
      <button
        type="button"
        className={`chat-launcher ${isOpen ? 'chat-launcher--open' : ''}`}
        onClick={toggleAgent}
        aria-label={buttonLabel}
        title={buttonLabel}
      >
        <span className="chat-launcher__pulse" aria-hidden="true" />
        <span className="chat-launcher__label">{buttonLabel}</span>
      </button>
    </div>
  );
}