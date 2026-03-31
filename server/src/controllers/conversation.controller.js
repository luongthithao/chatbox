import {
  createConversation,
  deleteConversation,
  getConversationById,
  listConversations,
  sendMessageToConversation,
  updateConversationTitle,
} from "../services/conversation.service.js";
import {
  assertOptionalString,
  assertPositiveInteger,
  assertString,
} from "../utils/validate.js";

export const getConversations = async (req, res, next) => {
  try {
    const conversations = await listConversations();
    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const postConversation = async (req, res, next) => {
  try {
    const title =
      assertOptionalString(req.body?.title, "title") || "Cuoc tro chuyen moi";
    const conversation = await createConversation(title);
    res.status(201).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const conversationId = assertPositiveInteger(
      req.params?.conversationId,
      "conversationId"
    );
    const conversation = await getConversationById(conversationId);
    res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const patchConversation = async (req, res, next) => {
  try {
    const conversationId = assertPositiveInteger(
      req.params?.conversationId,
      "conversationId"
    );
    const title = assertString(req.body?.title, "title");
    const conversation = await updateConversationTitle(conversationId, title);

    res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const removeConversation = async (req, res, next) => {
  try {
    const conversationId = assertPositiveInteger(
      req.params?.conversationId,
      "conversationId"
    );
    await deleteConversation(conversationId);

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const postConversationMessage = async (req, res, next) => {
  try {
    const conversationId = assertPositiveInteger(
      req.params?.conversationId,
      "conversationId"
    );
    const content = assertString(req.body?.content, "content");
    const result = await sendMessageToConversation(conversationId, content);

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
