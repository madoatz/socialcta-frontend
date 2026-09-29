# Social CTA Frontend
Static HTML administration UI hosted on GitHub Pages.

RUNTEST URL: https://madoatz.github.io/socialcta-frontend/runtest/

Production URL: https://madoatz.github.io/socialcta-frontend/production/

The API URL is selected by the page path in assets/config.js. RUNTEST uses socialcta-backend.vercel.app and Production uses socialcta-backend-prod.vercel.app. This file must contain only public HTTPS API base URLs, never a database password or admin password. Root pages remain compatible with the existing RUNTEST URL.

Login requests a one-hour signed bearer token from the backend. The token is kept in sessionStorage for this browser tab under an environment-specific key and removed on logout/expiry. Passwords are never stored by the application. All database operations go through the authenticated API.

Publish the main branch root through GitHub Pages. .nojekyll enables direct static publishing. Relative asset/navigation paths support the /socialcta-frontend/ project path.

Backend repository: https://github.com/madoatz/socialcta-backend

