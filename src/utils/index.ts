import { sendToApiGet } from "../services";
export async function isEmailUnique(email) {
  const response = await sendToApiGet("http://localhost:5000/agendamentos", {
    email,
  });
  const existingEmails = response; // Lista de exemplo
  return !existingEmails.includes(email); // Retorna true se for único
}
