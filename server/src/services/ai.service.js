import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chatWithAI(message) {
  const response = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "Bạn là trợ lý AI thân thiện." },
      { role: "user", content: message }
    ],
  });

  return response.choices[0].message.content;
}
