import * as Yup from "yup";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { MessageResponse, Schedules } from "./types";
import { showMainMenu } from "./menu_main";
import { sendToApi } from "../services";
import { DateTime } from "luxon";
import axios from "axios";
import { scheduleSchema } from "../validations";

dotenv.config();

// Suas variáveis e configurações de ambiente
const token = process.env.CALENDLY_API_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_ID;

if (!TELEGRAM_BOT_TOKEN || !token || !WHATSAPP_TOKEN || !PHONE_ID) {
  throw new Error("Missing environment variables");
}

export const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: true,
});

// Função para coletar e validar a resposta do usuário
const getMessageResponse = async (
  chatId: number,
  question: string
): Promise<MessageResponse> => {
  bot.sendMessage(chatId, question);
  return new Promise((resolve) => {
    bot.once("message", (response) => {
      resolve({ chatId, text: response.text || "" });
    });
  });
};

// Função para agendar o evento e notificar via WhatsApp
const scheduleEventOnCalendly = async (
  chatId: number,
  name: string,
  date: string,
  email: string,
  whatsapp: string,
  time: string
) => {
  try {
    const schedules: Schedules = {
      name: `Aula com ${name}`,
      email,
      date,
      time,
      client: chatId,
    };

    await sendToApi("http://localhost:5000/agendamentos", { schedules });

    const personalNumber = "whatsapp:+5511977943720";
    const messageTextNotifications = `Olá Personal! Você tem uma aula agendada para hoje, dia ${date} às ${time} com o aluno ${name}. Caso não consiga atender, entre em contato no WhatsApp: +55${whatsapp} para cancelar.`;

    const today = DateTime.now().toFormat("dd-MM-yyyy");
    if (date === today) {
      await bot.sendMessage(personalNumber, messageTextNotifications);
    }
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    bot.sendMessage(
      chatId,
      "Houve um erro ao criar seu agendamento. Por favor, tente novamente."
    );
  }
};

// Manipulador de eventos de mensagens recebidas
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (msg.text && ["oi", "ola", "olá"].includes(msg.text.toLowerCase())) {
    showMainMenu(chatId);
  }
});

// Manipulador para ações de callback
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message?.chat.id;
  const action = callbackQuery.data;

  if (action === "agendar") {
    try {
      const { text: name } = await getMessageResponse(
        chatId,
        "Informe seu nome e sobrenome"
      );
      const { text: email } = await getMessageResponse(
        chatId,
        "Informe seu e-mail (ex: example@example.com)"
      );
      const { text: whatsapp } = await getMessageResponse(
        chatId,
        "Informe seu número de whatsapp (ex: 11 94444-4444)"
      );
      const { text: date } = await getMessageResponse(
        chatId,
        "Informe uma data válida (ex: 30-10-2024)"
      );
      const { text: time } = await getMessageResponse(
        chatId,
        "Informe um horário válido entre 08:00 às 22:00 (ex: 15:00)"
      );

      // Validação com Yup
      await scheduleSchema.validate(
        { name, email, whatsapp, date, time },
        { abortEarly: false }
      );

      await scheduleEventOnCalendly(chatId, name, date, email, whatsapp, time);
      bot.sendMessage(
        chatId,
        `${name}, sua aula foi agendada para ${date} às ${time}!`
      );
      showMainMenu(chatId);
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        const errorMessages = error.errors.join("\n");
        bot.sendMessage(chatId, `Erros de validação:\n${errorMessages}`);
      } else {
        console.error("Erro ao processar agendamento:", error);
        bot.sendMessage(
          chatId,
          "Houve um erro ao processar seu agendamento. Tente novamente."
        );
      }
      showMainMenu(chatId);
    }
  }
});

console.log("Bot iniciado...");
