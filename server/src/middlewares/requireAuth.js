import AppError from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/auth.js";

const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      throw new AppError("Bạn chưa đăng nhập", 401);
    }

    const token = header.slice("Bearer ".length).trim();
    const payload = verifyAccessToken(token);

    req.user = {
      id: Number(payload.sub),
      username: payload.username,
    };

    next();
  } catch {
    next(new AppError("Phiên đăng nhập không hợp lệ", 401));
  }
};

export default requireAuth;
