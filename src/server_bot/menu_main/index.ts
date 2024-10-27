import { bot } from "..";

// Função para mostrar o menu principal
export const showMainMenu = (chatId: number) => {
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Agendar aulas", callback_data: "agendar" },
          { text: "Reagendar aulas", callback_data: "reagendar" },
        ],

        [
          { text: "Como funciona?", callback_data: "sobre" },
          { text: "Atendimento", callback_data: "atendimento" },
        ],
        [
          { text: "Realizar Pagamento", callback_data: "pagar" },
          { text: "Sair", callback_data: "sair" },
        ],
      ],
    },
  };
  bot.sendMessage(
    chatId,
    "Bem-vindo ao sistema automatizado do seu personal trainer! Escolha uma opção:",
    options
  );
};
