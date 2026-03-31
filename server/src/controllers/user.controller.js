import pool from "../config/db.js";
import bcrypt from "bcrypt";
import AppError from "../utils/AppError.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../utils/auth.js";
import { getEnv } from "../config/env.js";
import { assertString } from "../utils/validate.js";

const SALT_ROUNDS = 10;
const REFRESH_COOKIE_NAME = "refreshToken";

const serializeUser = (row) => ({
  id: Number(row.id),
  username: row.username,
  createdAt: row.created_at,
});

const createRefreshTokenExpiry = () => {
  const env = getEnv();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
};

const getRefreshCookieOptions = () => {
  const env = getEnv();
  const maxAge = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/api/users",
    maxAge,
  };
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getRefreshCookieOptions(),
    maxAge: undefined,
  });
};

const issueSession = async (user, res) => {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = createRefreshTokenExpiry();

  await pool.query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [user.id, refreshTokenHash, expiresAt]
  );

  setRefreshTokenCookie(res, refreshToken);

  return {
    user: serializeUser(user),
    accessToken: signAccessToken(user),
  };
};

const revokeRefreshToken = async (refreshToken) => {
  await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL
    `,
    [hashRefreshToken(refreshToken)]
  );
};

const revokeAllRefreshTokensForUser = async (userId) => {
  await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [userId]
  );
};

const getRefreshTokenFromRequest = (req) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (!refreshToken) {
    throw new AppError("Bạn chưa đăng nhập", 401);
  }

  return refreshToken;
};

export const register = async (req, res, next) => {
  try {
    const username = assertString(req.body?.username, "username", 3);
    const password = assertString(req.body?.password, "password", 6);

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError("Tên đăng nhập đã tồn tại", 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `
        INSERT INTO users (username, password_hash)
        VALUES ($1, $2)
        RETURNING id, username, created_at
      `,
      [username, passwordHash]
    );

    res.status(201).json({
      success: true,
      ...(await issueSession(result.rows[0], res)),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const username = assertString(req.body?.username, "username", 3);
    const password = assertString(req.body?.password, "password", 6);

    const result = await pool.query(
      `
        SELECT id, username, password_hash, created_at
        FROM users
        WHERE username = $1
      `,
      [username]
    );

    if (result.rows.length === 0) {
      throw new AppError("Sai tên đăng nhập hoặc mật khẩu", 401);
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError("Sai tên đăng nhập hoặc mật khẩu", 401);
    }

    res.json({
      success: true,
      ...(await issueSession(user, res)),
    });
  } catch (error) {
    next(error);
  }
};

export const refreshSession = async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    const tokenHash = hashRefreshToken(refreshToken);
    const result = await pool.query(
      `
        SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.username, u.created_at
        FROM refresh_tokens rt
        JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = $1
      `,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AppError("Refresh token không hợp lệ", 401);
    }

    const session = result.rows[0];

    if (session.revoked_at || new Date(session.expires_at) <= new Date()) {
      clearRefreshTokenCookie(res);
      throw new AppError("Refresh token đã hết hạn", 401);
    }

    await revokeRefreshToken(refreshToken);

    res.json({
      success: true,
      ...(await issueSession(
        {
          id: Number(session.user_id),
          username: session.username,
          created_at: session.created_at,
        },
        res
      )),
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    clearRefreshTokenCookie(res);

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutAllSessions = async (req, res, next) => {
  try {
    await revokeAllRefreshTokensForUser(req.user.id);
    clearRefreshTokenCookie(res);

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, username, created_at
        FROM users
        WHERE id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError("Không tìm thấy người dùng", 404);
    }

    res.json({
      success: true,
      user: serializeUser(result.rows[0]),
    });
  } catch (error) {
    next(error);
  }
};
