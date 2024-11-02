import cron from "node-cron";
import axios from "axios";
import nodemailer from "nodemailer";
import { Schedules } from "../../types";
import dotenv from "dotenv";

dotenv.config();
const VAR_EMAIL = process.env.EMAIL_USER;
const VAR_PASS = process.env.EMAIL_PASS;

if (!VAR_EMAIL || !VAR_PASS) {
  throw new Error("Missing environment variables");
}

// Função que busca os agendamentos na API e envia notificações
export const verificarAgendamentos = async () => {
  const dataAtual = new Date();
  const dataLimite = new Date(dataAtual.getTime() + 24 * 60 * 60 * 1000); // Próximas 24 horas

  const startDate = dataAtual.toISOString().split("T")[0];
  const endDate = dataLimite.toISOString().split("T")[0];

  try {
    const response = await axios.get<Schedules>(
      `http://localhost:5000/agendamentos?startDate=${startDate}&endDate=${endDate}`
    );

    const schedules = response.data;

    // // Verifica se `schedules` é um array antes de aplicar `.filter`
    if (!Array.isArray(schedules)) {
      console.error("Formato inesperado de dados:", schedules);
      return;
    }

    // Filtro para garantir que apenas datas futuras dentro das próximas 24 horas sejam selecionadas
    const upcomingSchedules = schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.schedules.date);
      return (
        scheduleDate >= dataAtual &&
        scheduleDate <= dataLimite &&
        schedule.schedules.email !== "example@example.com"
      );
    });

    if (upcomingSchedules.length === 0) {
      console.log("Nenhum agendamento nas próximas 24 horas");
      return;
    }

    // // Envia notificações por e-mail para cada agendamento
    const emailPromises = upcomingSchedules.map((schedule) =>
      sendEmailNotification(
        schedule.schedules.email || "example@example.com",
        "Lembrete de Agendamento",
        `Olá, ${schedule.schedules.name}! Este é um lembrete do seu agendamento em ${schedule.schedules.date} às ${schedule.schedules.time}, seu personal estará no aguardo. Caso não consiga comparecer peço que nos avise com pelomenos 12 horas de antecedência!`
      )
    );
    await Promise.all(emailPromises);
    console.log(emailPromises);
    console.log("Notificações enviadas com sucesso!");
  } catch (error) {
    console.error("Erro ao verificar agendamentos:", error);
  }
};

// Agenda a verificação para rodar diariamente às 8:00 AM
cron.schedule("0 8 * * *", verificarAgendamentos);

// Função para enviar notificações por e-mail
export const sendEmailNotification = async (
  email: string,
  assunto: string,
  mensagem: string
) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: VAR_EMAIL,
        pass: VAR_PASS,
      },
    });

    const mailOptions = {
      from: VAR_EMAIL,
      to: email,
      subject: assunto,
      text: mensagem,
    };

    await transporter.sendMail(mailOptions);
    console.log(`E-mail enviado para ${email}`);
    return { success: true, email };
  } catch (error) {
    console.error("Erro ao enviar e-mail:");
    return { success: false, error: error.message };
  }
};
