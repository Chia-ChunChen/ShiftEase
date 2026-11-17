const { createHash, randomBytes } = require("node:crypto");
const Session = require("../models/Session");
const User = require("../models/User");

const SESSION_COOKIE = "shiftease_session";
const SESSION_MS = 8 * 60 * 60 * 1000;
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api"
});

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionToken(req) {
  const prefix = SESSION_COOKIE + "=";
  const cookie = (req.get("cookie") || "").split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  const token = cookie?.slice(prefix.length);
  return /^[a-f0-9]{64}$/.test(token ?? "") ? token : null;
}

async function startSession(res, user) {
  const token = randomBytes(32).toString("hex");
  await Session.create({
    tokenHash: hashToken(token),
    user: user._id,
    version: user.sessionVersion ?? 0,
    expiresAt: new Date(Date.now() + SESSION_MS)
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_MS });
}

async function endSession(req, res) {
  const token = sessionToken(req);
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
  clearSessionCookie(res);
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

async function requireSession(req, res, next) {
  const token = sessionToken(req);
  if (token) {
    const session = await Session.findOne({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() }
    });
    if (session) {
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
