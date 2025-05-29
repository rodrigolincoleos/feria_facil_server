// middlewares/checkJwt.js
import { auth } from 'express-oauth2-jwt-bearer';
import dotenv from 'dotenv';

dotenv.config();

const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

export const checkJwt = auth({
  audience: audience,
  issuerBaseURL: `https://${domain}`,
  tokenSigningAlg: 'RS256'
});

// Middleware de depuración (temporal)
export const logJwtDebug = (req, res, next) => {
  console.log('🧾 Headers:', req.headers);
  console.log('🔓 Auth decoded (req.auth):', req.auth);
  next();
};
