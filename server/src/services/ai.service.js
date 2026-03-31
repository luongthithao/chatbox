import axios from "axios";
import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getEnv } from "../config/env.js";
import AppError from "../utils/AppError.js";

const SYSTEM_PROMPT = `
Ban la tro ly AI tieng Viet.

Nguyen tac tra loi:
- Luon tra loi bang tieng Viet tu nhien, ro y, de doc.
- Uu tien tra loi dung trong tam truoc, roi moi giai thich ngan neu can.
- Cau hoi ngan thi tra loi ngan. Cau hoi can huong dan thi trinh bay theo tung buoc.
- Neu nguoi dung yeu cau liet ke, hay liet ke dung so luong ho yeu cau.
- Neu cau hoi co nhieu cach hieu, chon cach hieu hop ly nhat theo ngu canh.
- Neu chua du du kien, hoi lai dung 1 cau ngan de lam ro.
- Khong bia thong tin. Neu khong chac, noi ro muc do khong chac.
- Khi tra loi dang danh sach, xuong dong ro rang, khong viet mot doan dai.
- Khi can dua ra lua chon, hay chot de xuat ro rang thay vi tra loi mo ho.
`.trim();

const toProviderRole = (role) => {
  if (role === "ai") {
    return "assistant";
  }

  return role;
};

const trimHistory = (messages, limit = 12) => {
  if (messages.length <= limit) {
    return messages;
  }

  return messages.slice(-limit);
};

const buildChatMessages = (messages) => [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
  ...trimHistory(messages).map((message) => ({
    role: toProviderRole(message.role),
    content: message.content,
  })),
];

let activeCompletionUrl = null;
let lmsStartAttempted = false;

const execFileAsync = promisify(execFile);

const COMMON_COMPLETION_URLS = [
  "http://127.0.0.1:1234/v1/chat/completions",
  "http://localhost:1234/v1/chat/completions",
  "http://127.0.0.1:4000/v1/chat/completions",
  "http://localhost:4000/v1/chat/completions",
];

const unique = (items) => [...new Set(items.filter(Boolean))];

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const isRetriableEndpointError = (error) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (!error.response) {
    return true;
  }

  return [404, 405, 502, 503, 504].includes(error.response.status);
};

const buildCandidateUrls = (env) => {
  const configuredUrl = env.LLM_BASE_URL?.trim();

  return unique([
    activeCompletionUrl,
    configuredUrl,
    configuredUrl?.replace("localhost", "127.0.0.1"),
    configuredUrl?.replace("127.0.0.1", "localhost"),
    ...COMMON_COMPLETION_URLS,
  ]);
};

const buildHeaders = (env) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (env.LLM_API_KEY) {
    headers.Authorization = `Bearer ${env.LLM_API_KEY}`;
  }

  return headers;
};

const getLmsCliCandidates = () => {
  const localAppData = process.env.LOCALAPPDATA;

  return unique([
    localAppData &&
      `${localAppData}\\Programs\\LM Studio\\resources\\app\\.webpack\\lms.exe`,
    "lms",
  ]);
};

const canAutoStartLocalServer = (error) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  return !error.response;
};

const ensureLocalLlmServerStarted = async () => {
  if (lmsStartAttempted) {
    return false;
  }

  lmsStartAttempted = true;

  for (const cliPath of getLmsCliCandidates()) {
    try {
      if (cliPath !== "lms") {
        await access(cliPath);
      }

      await execFileAsync(cliPath, ["server", "start"], {
        timeout: 15_000,
      });

      console.log(`[ai] Started LM Studio server via CLI: ${cliPath}`);
      await sleep(1500);
      return true;
    } catch {
      // Try the next CLI candidate.
    }
  }

  return false;
};

const requestCompletion = async (url, payload, env) => {
  const { data } = await axios.post(url, payload, {
    headers: buildHeaders(env),
    timeout: env.LLM_TIMEOUT_MS,
  });

  const reply = data?.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new AppError("AI khong tra ve noi dung hop le", 502);
  }

  return reply;
};

export const generateAIResponse = async (messages) => {
  const env = getEnv();
  const payload = {
    model: env.LLM_MODEL,
    messages: buildChatMessages(messages),
    temperature: 0.15,
    top_p: 0.85,
    stream: false,
  };
  const attemptedUrls = [];
  let lastError = null;

  const tryCandidateUrls = async () => {
    const candidateUrls = buildCandidateUrls(env);

    for (const url of candidateUrls) {
      try {
        attemptedUrls.push(url);
        const reply = await requestCompletion(url, payload, env);

        if (activeCompletionUrl !== url) {
          activeCompletionUrl = url;
          console.log(`[ai] Using completion endpoint: ${url}`);
        }

        return reply;
      } catch (error) {
        lastError = error;

        if (error instanceof AppError) {
          throw error;
        }

        if (!isRetriableEndpointError(error)) {
          break;
        }
      }
    }

    return null;
  };

  const firstReply = await tryCandidateUrls();

  if (firstReply) {
    return firstReply;
  }

  if (canAutoStartLocalServer(lastError)) {
    const started = await ensureLocalLlmServerStarted();

    if (started) {
      const secondReply = await tryCandidateUrls();

      if (secondReply) {
        return secondReply;
      }
    }
  }

  const error = lastError;

  try {
    if (error instanceof AppError) {
      throw error;
    }

    if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
      throw new AppError("AI phan hoi qua cham, vui long thu lai", 504);
    }

    if (axios.isAxiosError(error) && error.response) {
      throw new AppError(
        error.response.data?.error?.message ||
          error.response.data?.message ||
          "Dich vu AI tra ve loi",
        error.response.status || 502
      );
    }

    throw new AppError(
      `Khong the ket noi toi dich vu AI. Da thu: ${attemptedUrls.join(", ")}`,
      502
    );
  } catch (finalError) {
    throw finalError;
  }
};
