import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { MessageResponse, Schedules } from "./types"; // Verifique se o caminho está correto
import { showMainMenu } from "./menu_main";
import { sendToApi } from "../services";
import { DateTime } from "luxon";
import axios from "axios";

dotenv.config();

// Substitua pelo seu ID de chat pessoal do Telegram
// const personalChatId = process.env.PERSONAL_CHAT_ID;

// Crie um bot que usa 'polling' para buscar novas atualizações
export const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN as string, {
  polling: true,
});

// Função para agendar evento no Calendly
const scheduleEventOnCalendly = async (
  nome: string,
  data: string,
  horario: string
): Promise<any> => {
  const calendlyToken = process.env.CALENDLY_API_TOKEN; // Token de autenticação da API do Calendly

  if (!calendlyToken) {
    console.error("CALENDLY_API_TOKEN não está definido no ambiente.");
    throw new Error("Token de autenticação não fornecido.");
  }

  // Montar a data e hora do evento
  const startDateTime = DateTime.fromFormat(
    `${data} ${horario}`,
    "dd-MM-yyyy HH:mm"
  ).toISO(); // Início do evento
  const endDateTime = DateTime.fromFormat(
    `${data} ${horario}`,
    "dd-MM-yyyy HH:mm"
  )
    .plus({ hours: 1 })
    .toISO(); // Fim do evento

  // const eventDetails = {
  //   event: {
  //     name: `Aula com ${nome}`,
  //     start_time: startDateTime,
  //     end_time: endDateTime,
  //     event_type: "https://api.calendly.com/event_types/1", // Substitua com o URI do tipo de evento correto
  //     // Adicione outros parâmetros necessários aqui, como a URL de redirecionamento, etc.
  //   },
  // };
  const eventDetails = {
    event: {
      name: `Aula com ${nome}`,
      start_time: startDateTime,
      end_time: endDateTime,
      event_type: "https://api.calendly.com/event_types/1", // Substitua com o URI do tipo de evento correto
    },
    owner: process.env.URI_USER, // Substitua com o URI do usuário no Calendly
    owner_type: "User", // Pode ser "User" ou "Team", dependendo do contexto
    max_event_count: 1, // Define o número máximo de eventos que podem ser agendados
  };

  try {
    const response = await axios.post(
      "https://api.calendly.com/scheduling_links",
      eventDetails,
      {
        headers: {
          Authorization: `Bearer ${calendlyToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Evento agendado no Calendly!", response.data);
    return response.data; // Retorne os dados do evento agendado
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(
          "Erro ao agendar evento no Calendly:",
          error.response.data
        );
      } else if (error.request) {
        console.error(
          "Erro ao agendar evento no Calendly: Sem resposta do servidor",
          error.request
        );
      } else {
        console.error("Erro ao agendar evento no Calendly:", error.message);
      }
    } else {
      console.error("Erro inesperado:", error);
    }
    throw new Error("Erro ao agendar evento no Calendly.");
  }
};

// Função para obter a resposta do usuário
const getMessageResponse = async (
  chatId: number,
  question: string
): Promise<MessageResponse> => {
  bot.sendMessage(chatId, question);
  return new Promise((resolve) => {
    bot.once("message", (response) => {
      resolve({ chatId, text: response.text || "" }); // Lidar com caso onde o texto pode ser indefinido
    });
  });
};

// Evento quando o bot recebe uma mensagem
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // Verifique se msg.text está definido e lide com cumprimentos
  if (msg.text && ["oi", "ola", "olá"].includes(msg.text.toLowerCase())) {
    showMainMenu(chatId);
  }
});

console.log("Bot iniciado...");

// Evento para tratar ações de callback
bot.on("callback_query", async (callbackQuery) => {
  const chatId = callbackQuery.message!.chat.id;
  const action = callbackQuery.data;

  if (action === "agendar") {
    try {
      const { text: nome } = await getMessageResponse(
        chatId,
        "Informe seu nome completo"
      );
      const { text: data } = await getMessageResponse(
        chatId,
        "Informe uma data válida (ex: 30-10-2024)"
      );
      const { text: horario } = await getMessageResponse(
        chatId,
        "Informe um horário válido entre 08:00 às 22:00 (ex: 15:00)"
      );

      // Validação da data e hora
      const isDateValid = DateTime.fromFormat(data, "dd-MM-yyyy").isValid;
      const isTimeValid =
        /^\d{2}:\d{2}$/.test(horario) &&
        horario >= "08:00" &&
        horario <= "22:00";

      if (!isDateValid || !isTimeValid) {
        bot.sendMessage(chatId, "Data ou horário inválidos. Tente novamente.");
        return showMainMenu(chatId);
      }

      const selectedDateTime = DateTime.fromFormat(
        `${data} ${horario}`,
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

      const schedules: Schedules = {
        name: nome,
        data: data,
        time: horario,
        client: chatId, // Assumindo que chatId é o identificador do cliente
      };

      const apiResponse = await sendToApi(
        "http://localhost:5000/agendamentos",
        {
          agend: schedules,
        }
      );

      if (apiResponse) {
        const calendlyResponse = await scheduleEventOnCalendly(
          nome,
          data,
          horario
        );
        if (calendlyResponse) {
          bot.sendMessage(
            chatId,
            `${nome}, sua aula foi agendada para ${data} às ${horario}!`
          );
        }
      } else {
        bot.sendMessage(chatId, "Erro ao agendar aula. Tente novamente.");
      }

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
