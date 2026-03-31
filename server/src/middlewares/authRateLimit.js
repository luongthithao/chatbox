import AppError from "../utils/AppError.js";
import { getEnv } from "../config/env.js";

const buckets = new Map();

const authRateLimit = (req, res, next) => {
  const env = getEnv();
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.startTime >= env.AUTH_RATE_LIMIT_WINDOW_MS) {
    buckets.set(key, {
      count: 1,
      startTime: now,
    });
    next();
    return;
  }

  if (bucket.count >= env.AUTH_RATE_LIMIT_MAX) {
    next(
      new AppError(
        "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút",
        429
      )
    );
    return;
  }

  bucket.count += 1;
  next();
};

export default authRateLimit;
