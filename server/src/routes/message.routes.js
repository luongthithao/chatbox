import express from "express";
import { chatWithAI } from "../controllers/message.controller.js";

const router = express.Router();

router.post("/chat", chatWithAI);

export default router;
