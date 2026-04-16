import expressJwt from 'express-jwt';
import jwksRsa from 'jwks-rsa';

const getJwtMiddleware = expressJwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    jwksUri: `${process.env.ASGARDEO_ISSUER.replace(/\/oauth2\/token$/, '')}/.well-known/jwks.json`,
  }),
  audience: process.env.ASGARDEO_AUDIENCE,
  issuer: process.env.ASGARDEO_ISSUER,
  algorithms: ['RS256'],
});

export function authenticate(req, res, next) {
  getJwtMiddleware(req, res, (err) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized', details: err.message });
    }
    next();
  });
}

export function authorizeRole(requiredRole) {
  return (req, res, next) => {
    const roles = (req.auth && req.auth.roles) || [];
    if (!roles.includes(requiredRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
