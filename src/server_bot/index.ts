import * as Yup from "yup";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { MessageResponse, Schedule } from "./types";
import { showMainMenu } from "./menu_main";
import { sendToApi } from "../services";
import { DateTime } from "luxon";
import { scheduleSchema } from "../validations";
import { sendMessageNotificationWhats } from "./notifications/sendMessage_Whats";
// import { verificarAgendamentos } from "./notifications/sendMessage_Email";
dotenv.config();
console.log("Bot iniciado...");
// Suas variáveis e configurações de ambiente
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_ID;

if (!TELEGRAM_BOT_TOKEN || !WHATSAPP_TOKEN || !PHONE_ID) {
  throw new Error("Missing environment variables");
}

// Initialize the bot with polling: false
export const bot = new TelegramBot(TELEGRAM_BOT_TOKEN || "");

// Event handler for received messages
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (msg.text && ["oi", "ola", "olá"].includes(msg.text.toLowerCase())) {
    showMainMenu(chatId);
  }
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
    const schedules: Schedule = {
      name,
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
      await sendMessageNotificationWhats(
        personalNumber,
        messageTextNotifications
      );
    }
    return;
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    bot.sendMessage(
      chatId,
      "Houve um erro ao criar seu agendamento. Por favor, tente novamente."
    );
  }
};

// Manipulador para ações de callback
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message?.chat.id;
  const action = callbackQuery.data;

  if (action === "agendar") {
    try {
      // Função para obter e validar um campo específico
      const getValidatedResponse = async (
        question: string,
        field: keyof Yup.InferType<typeof scheduleSchema>
      ) => {
        let response;
        while (true) {
          response = (await getMessageResponse(chatId, question)).text;
          try {
            await scheduleSchema.validateAt(field, { [field]: response });
            break; // Validação passou, sai do loop
          } catch (error) {
            if (error instanceof Yup.ValidationError) {
              bot.sendMessage(chatId, error.message); // Envia a mensagem de erro específico para o campo
            }
          }
        }
        return response;
      };

      // Pergunta e valida cada campo individualmente
      const name = await getValidatedResponse(
        "Informe seu nome e sobrenome",
        "name"
      );
      const email = await getValidatedResponse(
        "Informe seu e-mail (ex: example@example.com)",
        "email"
      );
      const whatsapp = await getValidatedResponse(
        "Informe seu número de WhatsApp (ex: 11 94444-4444)",
        "whatsapp"
      );
      const date = await getValidatedResponse(
        "Informe uma data válida (ex: 30-10-2024)",
        "date"
      );
      const time = await getValidatedResponse(
        "Informe um horário válido entre 08:00 às 22:00 (ex: 15:00)",
        "time"
      );

      await scheduleEventOnCalendly(chatId, name, date, email, whatsapp, time);
      bot.sendMessage(
        chatId,
        `${name}, sua aula foi agendada para ${date} às ${time}!`
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
