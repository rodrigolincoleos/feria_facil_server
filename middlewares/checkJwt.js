import { expressjwt } from 'express-jwt';
import { auth } from 'express-oauth2-jwt-bearer';
import jwksRsa from 'jwks-rsa';
import dotenv from 'dotenv';

dotenv.config();

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

export const checkJwt = auth({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${domain}/.well-known/jwks.json`
  }),
  audience: audience,
  issuer: `https://${domain}/`,
  algorithms: ['RS256']
});
