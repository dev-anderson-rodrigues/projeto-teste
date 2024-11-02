import axios from "axios";
import { Availability } from "./types";

const checkDayAvailability = async (date: string): Promise<boolean> => {
  try {
    // Faz a requisição e espera a resposta da API
    const availabilityResponse = await axios.get(
      "http://localhost:5000/availability"
    );
    const availableSlots: Availability[] = availabilityResponse.data;

    const dayOfTheWeek = new Date(date).getDay();
    const dayAvailability = availableSlots.find(
      (item) => Array.isArray(item.day) && item.day.includes(dayOfTheWeek)
    );

    console.log("dayAvailability:", dayAvailability);
    console.log("dayOfTheWeek:", dayOfTheWeek);

    if (!dayAvailability || !Array.isArray(dayAvailability.timeSlot)) {
      console.error(
        "Nenhuma disponibilidade de horário válida encontrada para o dia."
      );
      return false;
    }

    // Se chegar aqui, significa que `dayAvailability` e `timeSlot` estão disponíveis
    return true;
  } catch (error) {
    console.error("Erro ao verificar disponibilidade:", error);
    return false;
  }
};
const date = "01-11-2024";
checkDayAvailability(date);
