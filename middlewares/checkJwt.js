import jwt from 'express-jwt';
import jwks from 'jwks-rsa';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

export const checkJwt = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `${domain}.well-known/jwks.json`,
  }),
  audience: audience,
  issuer: domain,
  algorithms: ['RS256'],
});
