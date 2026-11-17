const { createHash, randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const User = require("../models/User");

const SESSION_COOKIE = "shiftease_session";
const SESSION_MS = 8 * 60 * 60 * 1000;
const TOKEN_ISSUER = "shiftease";
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api"
});

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function readCredentials(req) {
  const authorization = req.get("authorization");
  if (authorization !== undefined) {
    const bearer = /^Bearer (\S+)$/i.exec(authorization);
    if (!bearer || !process.env.JWT_SECRET) return null;
    try {
      const claims = jwt.verify(bearer[1], process.env.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: TOKEN_ISSUER
      });
      if (!TOKEN_PATTERN.test(claims.jti ?? "") || typeof claims.sub !== "string") return null;
      return { tokenHash: claims.jti, userId: claims.sub };
    } catch {
      return null;
    }
  }

  const prefix = SESSION_COOKIE + "=";
  const cookie = (req.get("cookie") || "").split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  const token = cookie?.slice(prefix.length);
  return TOKEN_PATTERN.test(token ?? "") ? { tokenHash: hashToken(token) } : null;
}

async function startSession(res, user) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const bearer = process.env.JWT_SECRET
    ? jwt.sign(
        { userId: user._id.toString(), role: user.role },
        process.env.JWT_SECRET,
        {
          algorithm: "HS256",
          issuer: TOKEN_ISSUER,
          subject: user._id.toString(),
          jwtid: tokenHash,
          expiresIn: process.env.JWT_EXPIRES_IN || "8h"
        }
      )
    : undefined;

  await Session.create({
    tokenHash,
    user: user._id,
    version: user.sessionVersion ?? 0,
    expiresAt: new Date(Date.now() + SESSION_MS)
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_MS });
  return bearer;
}

async function endSession(req, res) {
  const credentials = readCredentials(req);
  if (credentials) await Session.deleteOne({ tokenHash: credentials.tokenHash });
  clearSessionCookie(res);
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

async function requireSession(req, res, next) {
  const credentials = readCredentials(req);
  if (credentials) {
    const session = await Session.findOne({
      tokenHash: credentials.tokenHash,
      expiresAt: { $gt: new Date() }
    });
    if (session && (!credentials.userId || credentials.userId === session.user.toString())) {
      const user = await User.findById(session.user);
      if (user && session.version === (user.sessionVersion ?? 0)) {
        req.user = user;
        return next();
      }
    }
  }
  return res.status(401).json({ message: "Sign in to continue." });
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (req.user.mustChangePassword) {
      return res.status(403).json({ message: "Change your temporary password first." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission for this action." });
    }
    return next();
  };
}

module.exports = { startSession, endSession, clearSessionCookie, requireSession, allowRoles };
