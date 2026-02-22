const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Загрузка секретов из среды выполнения GitHub Actions
const apiId = parseInt(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = new StringSession(process.env.STRING_SESSION);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
let isTalkMode = false;

(async () => {
  console.log("Инициализация клиента...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log("--- БОТ В СЕТИ (Node.js) ---");

  client.addEventHandler(async (event) => {
    const message = event.message;

    // Проверяем, что сообщение исходит от тебя
    if (message && message.out && message.message) {
      const text = message.message.toLowerCase();

      // Команда включения режима разговора
      if (text === ".talk") {
        isTalkMode = true;
        await client.editMessage(message.chatId, {
          message: message.id,
          text: "🤖 **ИИ включен.** Готов к общению!",
        });
        return;
      }

      // Команда выключения режима разговора
      if (text === ".talkoff") {
        isTalkMode = false;
        await client.editMessage(message.chatId, {
          message: message.id,
          text: "🔇 **ИИ выключен.** Перехожу в режим ожидания команд.",
        });
        return;
      }

      // Если режим включен и это не другая команда (начинающаяся с точки)
      if (isTalkMode && !text.startsWith(".")) {
        try {
          const result = await model.generateContent(message.message);
          const response = await result.response;
          
          // Отправляем ответ от ИИ
          await client.sendMessage(message.chatId, {
            message: `**Gemini:** ${response.text()}`,
            replyTo: message.id,
          });
        } catch (e) {
          console.error("Ошибка при запросе к Gemini:", e.message);
        }
      }
    }
  });
})();
