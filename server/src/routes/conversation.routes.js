import express from "express";
import {
  getConversation,
  getConversations,
  patchConversation,
  postConversation,
  postConversationMessage,
  removeConversation,
} from "../controllers/conversation.controller.js";

const router = express.Router();

router.get("/", getConversations);
router.post("/", postConversation);
router.get("/:conversationId", getConversation);
router.patch("/:conversationId", patchConversation);
router.delete("/:conversationId", removeConversation);
router.post("/:conversationId/messages", postConversationMessage);

export default router;
