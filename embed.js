(function() {
  /**
   * ZAN CHATBOT WIDGET
   * 
   * Configuration Priority:
   * 1. `data-bot-url` attribute on the script tag.
   * 2. `MANUAL_HOST_URL` variable below (for copy/paste).
   * 3. Auto-detected location of this script file.
   */
  const MANUAL_HOST_URL = ""; 

  // --- Logic to determine the App URL ---
  let APP_URL = MANUAL_HOST_URL;
  let scriptTag = document.currentScript;

  // If deferred, currentScript might be null, so try to find the script by filename
  if (!scriptTag) {
    scriptTag = document.querySelector('script[src*="embed.js"]');
  }

  // 1. Check data attribute
  if (scriptTag && scriptTag.getAttribute('data-bot-url')) {
    APP_URL = scriptTag.getAttribute('data-bot-url');
  }
  
  // 2. Fallback to Auto-detect from script src
  if (!APP_URL && scriptTag && scriptTag.src) {
    try {
      const scriptUrl = new URL(scriptTag.src);
      // Remove 'embed.js' to get base path
      APP_URL = scriptUrl.href.substring(0, scriptUrl.href.lastIndexOf('/'));
    } catch (e) {
      console.warn("Zan Widget: Could not determine origin from script src.");
    }
  }

  // 3. Last Resort: Current Origin
  if (!APP_URL) {
    APP_URL = window.location.origin;
  }

  // Sanitize
  APP_URL = APP_URL.replace(/\/$/, "");

  // Debugging Check
  if (window.location.hostname !== 'localhost' && APP_URL === window.location.origin && !MANUAL_HOST_URL) {
      console.warn(
          "%c[Zan Widget Warning] The bot URL is set to the current origin (" + APP_URL + ").\n" +
          "If your bot is hosted elsewhere (e.g. GitHub Pages), the widget will load the WRONG page.\n" +
          "FIX: Add data-bot-url='YOUR_BOT_URL' to the script tag.", 
          "color: orange; font-weight: bold;"
      );
  } else {
      console.log("Zan Widget connecting to:", APP_URL);
  }

  // --- Styles ---
  const style = document.createElement('style');
  style.textContent = `
    #zan-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    
    #zan-widget-frame-container {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 400px;
      height: 600px;
      max-height: calc(100vh - 100px);
      max-width: calc(100vw - 40px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 25px rgba(0,0,0,0.15);
      border: 1px solid rgba(0,0,0,0.05);
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      transform-origin: bottom right;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
    }
    
    #zan-widget-frame-container.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }
    
    #zan-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background-color: #f8fafc; /* Placeholder color while loading */
    }
    
    #zan-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      background: #059669; 
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, background-color 0.2s;
      border: none;
      outline: none;
    }
    
    #zan-widget-button:hover {
      transform: scale(1.05);
      background: #047857;
    }
    
    #zan-widget-button svg {
      color: white;
      width: 30px;
      height: 30px;
      transition: transform 0.3s ease;
    }
    
    #zan-widget-container.open #zan-widget-button svg.open-icon {
      transform: rotate(90deg) scale(0);
      display: none;
    }
    
    #zan-widget-container.open #zan-widget-button svg.close-icon {
      display: block;
      transform: rotate(0);
    }
    
    #zan-widget-button svg.close-icon {
      display: none;
      transform: rotate(-90deg);
    }

    @media (max-width: 480px) {
      #zan-widget-frame-container {
        width: calc(100vw - 40px);
        bottom: 80px;
        right: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // --- DOM Elements ---
  const container = document.createElement('div');
  container.id = 'zan-widget-container';

  const frameContainer = document.createElement('div');
  frameContainer.id = 'zan-widget-frame-container';
  
  const iframe = document.createElement('iframe');
  iframe.id = 'zan-widget-iframe';
  iframe.src = `${APP_URL}/?mode=widget`; 
  iframe.title = "Zan Chatbot";
  iframe.allow = "microphone";
  
  frameContainer.appendChild(iframe);

  const button = document.createElement('button');
  button.id = 'zan-widget-button';
  button.ariaLabel = "Open Chat";
  button.innerHTML = `
    <!-- Message Icon -->
    <svg class="open-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <!-- Close Icon -->
    <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  // --- Event Handlers ---
  let isOpen = false;
  button.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      container.classList.add('open');
      frameContainer.classList.add('open');
      
      // Reload iframe if it was blank/error (optional optimization)
      if (iframe.contentWindow && iframe.contentWindow.location.href === 'about:blank') {
          iframe.src = `${APP_URL}/?mode=widget`;
      }
    } else {
      container.classList.remove('open');
      frameContainer.classList.remove('open');
    }
  };

  // Append to Body
  container.appendChild(frameContainer);
  container.appendChild(button);
  document.body.appendChild(container);

})();