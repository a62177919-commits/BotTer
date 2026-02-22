const { TelegramClient, events } = require("telegram"); // Добавили events
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
    // Добавляем настройки для более стабильного соединения
    useWSS: true, 
  });

  await client.connect();
  console.log("--- БОТ УСПЕШНО ЗАПУЩЕН ---");
  
  // Получаем информацию о себе, чтобы знать свой ID
  const me = await client.getMe();
  console.log(`Бот запущен от имени: ${me.firstName} (ID: ${me.id})`);

  // Используем другой способ прослушки событий
  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message) return;

    const text = message.message ? message.message.toLowerCase().trim() : "";
    
    // ЛОГИРУЕМ ВООБЩЕ ВСЁ (даже чужие сообщения, чтобы проверить связь)
    console.log(`[DEBUG] Пришло сообщение: "${text}" от ID: ${message.fromId}`);

    // Проверяем, что это наше сообщение (команды)
    if (message.out) {
      if (text === ".talk") {
        isTalkMode = true;
        await client.editMessage(message.chatId, {
          message: message.id,
          text: "🤖 **AI активен!**",
        });
        return;
      }

      if (text === ".talkoff") {
        isTalkMode = false;
        await client.editMessage(message.chatId, {
          message: message.id,
          text: "🔇 **AI выключен.**",
        });
        return;
      }

      // Если режим включен и мы пишем (не команду)
      if (isTalkMode && !text.startsWith(".")) {
        try {
          const result = await model.generateContent(message.message);
          const response = await result.response;
          await client.sendMessage(message.chatId, {
            message: `**Gemini:** ${response.text()}`,
            replyTo: message.id,
          });
        } catch (e) {
          console.log("Ошибка Gemini:", e.message);
        }
      }
    }
  }, new events.NewMessage({})); // Слушаем абсолютно все новые сообщения

  await new Promise(() => {}); 
})();
