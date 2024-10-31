import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { bot } from "./index"; // Import the bot instance from index.ts
import { verificarAgendamentos } from "./notifications/sendMessage_Email";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to process request body
app.use(bodyParser.json());
verificarAgendamentos();

// Webhook configuration
app.post(`/webhook/${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  const update = req.body;
  try {
    bot.processUpdate(update);
    res.sendStatus(200); // Respond with 200 OK
  } catch (error) {
    console.error("Error processing update:", error);
    res.sendStatus(500); // Respond with 500 Internal Server Error
  }
});

// Define the webhook on Telegram
const setWebhook = async () => {
  const url = `https://fd82-2804-868-d050-7741-4816-ed2-4fe3-b8ed.ngrok-free.app/webhook/${process.env.TELEGRAM_BOT_TOKEN}`; // Update with your actual domain
  try {
    await bot.setWebHook(url);
  } catch (error) {
    console.error("Error setting webhook:", error);
  }
};

// Start the server
const startServer = async () => {
  try {
    app.listen(PORT, async () => {
      console.log(`Server running on port ${PORT}`);
      await setWebhook();
    });
  } catch (error) {
    console.error("Error starting server:", error);
  }
};

startServer();

// Graceful shutdown
const shutdown = async () => {
  await bot.deleteWebHook();
  console.log("Webhook deleted and server shutting down.");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
