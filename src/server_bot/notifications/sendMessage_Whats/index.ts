import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.PHONE_ID;

// Função para enviar uma mensagem de texto pelo WhatsApp
export const sendMessageNotificationWhats = async (
  to: string,
  message: string
) => {
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
    return response.data;
  } catch (error: any) {
    console.error(
      "Erro ao enviar a mensagem:",
      error.response?.data || error.message
    );
  }
};
