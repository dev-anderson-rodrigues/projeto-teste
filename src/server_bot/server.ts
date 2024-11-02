import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { bot } from "./index"; // Importar a instância do bot de index.ts
import { verificarAgendamentos } from "./notifications/sendMessage_Email";
import localtunnel from "localtunnel";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware para processar o corpo da requisição
app.use(bodyParser.json());
verificarAgendamentos();

// Configuração do webhook
app.post(`/webhook/${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  const update = req.body;
  try {
    bot.processUpdate(update);
    res.sendStatus(200); // Responde com 200 OK
  } catch (error) {
    console.error("Error processing update:", error);
    res.sendStatus(500); // Responde com 500 Internal Server Error
  }
});

// Definir o webhook no Telegram
const setWebhook = async (tunnelUrl) => {
  const url = `${tunnelUrl}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
  try {
    await bot.setWebHook(url);
    console.log(`Webhook set to ${url}`);
  } catch (error) {
    console.error("Error setting webhook:", error);
  }
};

// Iniciar o servidor
const startServer = async () => {
  try {
    const server = app.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);

      // Criar túnel LocalTunnel
      const tunnel = await localtunnel({ port: PORT });
      console.log(`LocalTunnel URL: ${tunnel.url}`);

      // Definir o webhook
      await setWebhook(tunnel.url);

      // Evento para fechar o túnel ao encerrar o servidor
      tunnel.on("close", () => {
        console.log("LocalTunnel closed");
      });
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
};

startServer();

// Encerramento gracioso
const shutdown = async () => {
  await bot.deleteWebHook();
  console.log("Webhook deleted and server shutting down.");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
