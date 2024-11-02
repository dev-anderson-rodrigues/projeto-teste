import axios from "axios";

// Function to send data to API
export const sendToApiPost = async (url: string, data?: any) => {
  try {
    const response = await axios.post(url, data);
    return response.data; // Retorna os dados da resposta
  } catch (error) {
    console.error("Erro ao enviar dados para a API:", error);
    return null; // Em caso de erro, retorne null
  }
};

export const sendToApiGet = async (url: string, data?: any) => {
  try {
    const response = await axios.get(url, data);
    return response.data; // Retorna os dados da resposta
  } catch (error) {
    console.error("Erro ao buscar dados na API:", error);
    return null; // Em caso de erro, retorne null
  }
};
