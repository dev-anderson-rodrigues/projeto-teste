import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { MessageResponse, Schedules } from "./types";
import { showMainMenu } from "./menu_main";
import { sendToApi } from "../services";
import { DateTime } from "luxon";
import axios from "axios";

dotenv.config();

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

// Função para enviar uma mensagem de texto pelo WhatsApp
const sendMessage = async (to: string, message: string) => {
  const url = `https://graph.facebook.com/v16.0/${PHONE_ID}/messages`;
  try {
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Mensagem enviada com sucesso:", response.data);
  } catch (error: any) {
    console.error(
      "Erro ao enviar a mensagem:",
      error.response?.data || error.message
    );
  }
};

// Função para agendar o evento e notificar via WhatsApp
const scheduleEventOnCalendly = async (
  chatId: number,
  name: string,
  date: string,
  email: string,
  whattsapp: string,
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

    // const phoneNumber = "whatsapp:+5511977943720"; // Número do aluno
    // const messageText = `Olá ${name}! Você tem uma aula agendada para ${date}, às ${time}. Posso confirmar sua presença? Endereço: Al. Prof. Lucas Nogueira Garcez 3565, Atibaia, SP. Caso não consiga comparecer, entre em contato no WhatsApp (11)97794-3720 para efetuar o cancelamento obrigado.`;

    const personalNumber = "whatsapp:+5511977943720"; // Número do personal
    const messageTextNotifications = `Olá Personal! Você tem uma aula agendada para hoje dia ${date} às ${time} com o aluno ${name}. Caso não consiga atender entre contato no whattsapp: +55${whattsapp} para efetuar o cancelamento.`;

    // await sendMessage(phoneNumber, messageText);

    // Envia a notificação ao personal apenas se o evento é hoje
    const today = DateTime.now().toFormat("dd-MM-yyyy");
    if (date === today) {
      await sendMessage(personalNumber, messageTextNotifications);
    }
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    bot.sendMessage(
      chatId,
      "Houve um erro ao criar seu agendamento. Por favor, tente novamente."
    );
  }
};

// Função para obter resposta do usuário
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
      const { text: nome } = await getMessageResponse(
        chatId,
        "Informe seu nome completo"
      );
      const { text: email } = await getMessageResponse(
        chatId,
        "Informe seu e-mail"
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

      const isDateValid = DateTime.fromFormat(date, "dd-MM-yyyy").isValid;
      const isTimeValid = /^\d{2}:\d{2}$/.test(time);

      if (!isDateValid || !isTimeValid) {
        bot.sendMessage(chatId, "Data ou horário inválidos. Tente novamente.");
        return showMainMenu(chatId);
      }

      const selectedDateTime = DateTime.fromFormat(
        `${date} ${time}`,
        "dd-MM-yyyy HH:mm"
      );
      const now = DateTime.now();
      const oneHourFromNow = now.plus({ hours: 1 });

      if (
        selectedDateTime.hasSame(now, "day") &&
        selectedDateTime < oneHourFromNow
      ) {
        bot.sendMessage(
          chatId,
          "A aula deve ser agendada com pelo menos 1 hora de antecedência."
        );
        return showMainMenu(chatId);
      }

      await scheduleEventOnCalendly(chatId, nome, date, email, whatsapp, time);

      bot.sendMessage(
        chatId,
        `${nome}, sua aula foi agendada para ${date} às ${time}! Endereço: Al. Prof. Lucas Nogueira Garcez 3565, Atibaia, SP.`
      );
      showMainMenu(chatId);
    } catch (error) {
      console.error("Erro ao processar agendamento:", error);
      bot.sendMessage(
        chatId,
        "Houve um erro ao processar seu agendamento. Tente novamente."
      );
      showMainMenu(chatId);
    }
  }
});

console.log("Bot iniciado...");
