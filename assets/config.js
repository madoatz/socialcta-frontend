const socialCtaEnvironment=location.pathname.split('/').includes('production')?'production':'runtest';
window.SOCIAL_CTA_CONFIG=Object.freeze({
 environment:socialCtaEnvironment,
 apiBaseUrl:socialCtaEnvironment==='production'
  ?'https://socialcta-backend-prod.vercel.app'
  :'https://socialcta-backend.vercel.app'
});

