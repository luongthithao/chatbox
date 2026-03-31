import AppError from "./AppError.js";

export const assertString = (value, fieldName, minLength = 1) => {
  if (typeof value !== "string") {
    throw new AppError(`${fieldName} phải là chuỗi`, 400);
  }

  const normalized = value.trim();

  if (normalized.length < minLength) {
    throw new AppError(
      `${fieldName} phải có ít nhất ${minLength} ký tự`,
      400
    );
  }

  return normalized;
};

export const assertOptionalString = (value, fieldName, maxLength = 120) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const normalized = assertString(value, fieldName);

  if (normalized.length > maxLength) {
    throw new AppError(`${fieldName} không được vượt quá ${maxLength} ký tự`, 400);
  }

  return normalized;
};

export const assertPositiveInteger = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} phải là số nguyên dương`, 400);
  }

  return parsed;
};

export const assertMessages = (value) => {
  if (!Array.isArray(value)) {
    throw new AppError("messages phải là một mảng", 400);
  }

  if (value.length === 0) {
    throw new AppError("messages không được để trống", 400);
  }

  return value.map((message, index) => {
    if (!message || typeof message !== "object") {
      throw new AppError(`messages[${index}] không hợp lệ`, 400);
    }

    const role = assertString(message.role, `messages[${index}].role`);
    const content = assertString(
      message.content,
      `messages[${index}].content`
    );

    if (!["user", "ai", "assistant"].includes(role)) {
      throw new AppError(
        `messages[${index}].role phải là user, ai hoặc assistant`,
        400
      );
    }

    return {
      role: role === "assistant" ? "ai" : role,
      content,
    };
  });
};
