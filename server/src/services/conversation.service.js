import pool from "../config/db.js";
import { generateAIResponse } from "./ai.service.js";
import AppError from "../utils/AppError.js";

const DEFAULT_TITLE = "Cuoc tro chuyen moi";

const toConversationSummary = (row) => ({
  id: Number(row.id),
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastMessage: row.last_message || "",
});

const toMessage = (row) => ({
  id: Number(row.id),
  role: row.role,
  content: row.content,
  createdAt: row.created_at,
});

const buildConversationTitle = (content) => {
  const normalized = content.trim().replace(/\s+/g, " ");
  return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
};

export const listConversations = async () => {
  const { rows } = await pool.query(
    `
      SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        (
          SELECT m.content
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC, m.id DESC
          LIMIT 1
        ) AS last_message
      FROM conversations c
      WHERE c.user_id IS NULL
      ORDER BY c.updated_at DESC, c.id DESC
    `
  );

  return rows.map(toConversationSummary);
};

export const createConversation = async (title = DEFAULT_TITLE) => {
  const { rows } = await pool.query(
    `
      INSERT INTO conversations (user_id, title)
      VALUES (NULL, $1)
      RETURNING id, title, created_at, updated_at
    `,
    [title]
  );

  return {
    ...toConversationSummary(rows[0]),
    messages: [],
  };
};

export const getConversationById = async (conversationId) => {
  const conversationResult = await pool.query(
    `
      SELECT id, title, created_at, updated_at
      FROM conversations
      WHERE id = $1 AND user_id IS NULL
    `,
    [conversationId]
  );

  if (conversationResult.rows.length === 0) {
    throw new AppError("Khong tim thay cuoc tro chuyen", 404);
  }

  const messagesResult = await pool.query(
    `
      SELECT id, role, content, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [conversationId]
  );

  return {
    id: Number(conversationResult.rows[0].id),
    title: conversationResult.rows[0].title,
    createdAt: conversationResult.rows[0].created_at,
    updatedAt: conversationResult.rows[0].updated_at,
    messages: messagesResult.rows.map(toMessage),
  };
};

export const updateConversationTitle = async (conversationId, title) => {
  const { rows } = await pool.query(
    `
      UPDATE conversations
      SET title = $2, updated_at = NOW()
      WHERE id = $1 AND user_id IS NULL
      RETURNING id, title, created_at, updated_at
    `,
    [conversationId, title]
  );

  if (rows.length === 0) {
    throw new AppError("Khong tim thay cuoc tro chuyen", 404);
  }

  return {
    ...toConversationSummary(rows[0]),
    messages: (await getConversationById(conversationId)).messages,
  };
};

export const deleteConversation = async (conversationId) => {
  const { rowCount } = await pool.query(
    `
      DELETE FROM conversations
      WHERE id = $1 AND user_id IS NULL
    `,
    [conversationId]
  );

  if (rowCount === 0) {
    throw new AppError("Khong tim thay cuoc tro chuyen", 404);
  }
};

export const addMessageToConversation = async (conversationId, role, content) => {
  const { rows } = await pool.query(
    `
      INSERT INTO messages (conversation_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING id, role, content, created_at
    `,
    [conversationId, role, content]
  );

  await pool.query(
    `
      UPDATE conversations
      SET updated_at = NOW()
      WHERE id = $1
    `,
    [conversationId]
  );

  return toMessage(rows[0]);
};

export const sendMessageToConversation = async (conversationId, content) => {
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const conversationResult = await client.query(
      `
        SELECT id, title
        FROM conversations
        WHERE id = $1 AND user_id IS NULL
        FOR UPDATE
      `,
      [conversationId]
    );

    if (conversationResult.rows.length === 0) {
      throw new AppError("Khong tim thay cuoc tro chuyen", 404);
    }

    const currentConversation = conversationResult.rows[0];
    const userMessageResult = await client.query(
      `
        INSERT INTO messages (conversation_id, role, content)
        VALUES ($1, 'user', $2)
        RETURNING id, role, content, created_at
      `,
      [conversationId, content]
    );

    if (currentConversation.title === DEFAULT_TITLE) {
      await client.query(
        `
          UPDATE conversations
          SET title = $2, updated_at = NOW()
          WHERE id = $1
        `,
        [conversationId, buildConversationTitle(content)]
      );
    } else {
      await client.query(
        `
          UPDATE conversations
          SET updated_at = NOW()
          WHERE id = $1
        `,
        [conversationId]
      );
    }

    const historyResult = await client.query(
      `
        SELECT id, role, content, created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [conversationId]
    );

    await client.query("COMMIT");
    transactionOpen = false;

    const history = historyResult.rows.map(toMessage);
    const reply = await generateAIResponse(
      history.map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      }))
    );

    const aiMessage = await addMessageToConversation(conversationId, "ai", reply);
    const conversation = await getConversationById(conversationId);

    return {
      conversation,
      userMessage: toMessage(userMessageResult.rows[0]),
      aiMessage,
    };
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK");
    }

    throw error;
  } finally {
    client.release();
  }
};
