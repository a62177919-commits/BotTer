const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiId = parseInt(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const stringSession = new StringSession(process.env.STRING_SESSION);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
let isTalkMode = false;

(async () => {
  console.log("Соединение...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log("--- БОТ УСПЕШНО ЗАПУЩЕН ---");
  console.log("Слушаю ваши сообщения...");

  client.addEventHandler(async (event) => {
    const message = event.message;

    // Выводим в логи GitHub всё, что бот видит (для отладки)
    if (message && message.message) {
        console.log(`[LOG] Вижу текст: ${message.message} (Исходящее: ${message.out})`);
    }

    // Проверяем: сообщение должно быть исходящим (от тебя)
    if (message && message.out) {
      const text = message.message ? message.message.toLowerCase().trim() : "";

      // Команда .talk
      if (text === ".talk") {
        isTalkMode = true;
        await client.editMessage(message.chatId, {
          message: message.id,
          text: "🤖 **AI Mode: ON**\nТеперь я отвечаю на всё!",
        });
        return;
      }

      // Команда .talkoff
      if (text === ".talkoff") {
        isTalkMode = false;
        await client.editMessage(message.chatId, {
          message: message.id,
          text: "🔇 **AI Mode: OFF**",
        });
        return;
      }

      // Если режим включен и это не команда
      if (isTalkMode && !text.startsWith(".")) {
        try {
          const result = await model.generateContent(message.message);
          const response = await result.response;
          
          await client.sendMessage(message.chatId, {
            message: `**Gemini:** ${response.text()}`,
            replyTo: message.id,
          });
        } catch (e) {
          console.error("Ошибка Gemini:", e.message);
        }
      }
    }
  });

  await new Promise(() => {}); 
})();
