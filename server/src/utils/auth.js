import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env.js";

export const signAccessToken = (user) => {
  const env = getEnv();

  return jwt.sign(
    {
      sub: String(user.id),
      username: user.username,
      type: "access",
    },
    env.JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
};

export const verifyAccessToken = (token) => {
  const env = getEnv();
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (payload.type !== "access") {
    throw new Error("Invalid token type");
  }

  return payload;
};

export const generateRefreshToken = () => crypto.randomBytes(48).toString("hex");

export const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
