# Social CTA Frontend
Static HTML administration UI hosted on GitHub Pages.

Production URL: https://madoatz.github.io/socialcta-frontend/

The API URL is configured in assets/config.js. This file must contain only the public HTTPS API base URL, never a database password or admin password.

Login requests a one-hour signed bearer token from the backend. The token is kept in sessionStorage for this browser tab and removed on logout/expiry. Passwords are never stored by the application. All database operations go through the authenticated API.

Publish the main branch root through GitHub Pages. .nojekyll enables direct static publishing. Relative asset/navigation paths support the /socialcta-frontend/ project path.

Backend repository: https://github.com/madoatz/socialcta-backend

