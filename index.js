const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Загрузка секретов [cite: 2026-02-04]
const apiId = parseInt(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = new StringSession(process.env.STRING_SESSION);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
let isTalkMode = false;

(async () => {
  console.log("Запуск клиента...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log("--- БОТ В СЕТИ (Node.js) ---");

  // Обработчик сообщений [cite: 2026-02-02, 2026-02-04]
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (message && message.out && message.message) {
      const text = message.message.toLowerCase();

      if (text === ".talk") {
        isTalkMode = true;
        await client.editMessage(message.chatId, {
          message: message.id,
          text: "🤖 **ИИ включен.**",
        });
        return;
      }

      if (text === ".talkoff") {
        isTalkMode = false;
        await client.editMessage(message.chatId, {
          message: message.id,
          text: "🔇 **ИИ выключен.**",
        });
        return;
      }

      if (isTalkMode && !text.startsWith(".")) {
        try {
          const result = await model.generateContent(message.message);
          const response = await result.response;
          await client.sendMessage(message.chatId, {
            message: `**Gemini:** ${response.text()}`,
            replyTo: message.id,
          });
        } catch (e) {
          console.error("Ошибка ИИ:", e.message);
        }
      }
    }
  });

  // ЭТА СТРОЧКА НЕ ДАЕТ БОТУ ВЫКЛЮЧИТЬСЯ
  await new Promise(() => {}); 
})();
