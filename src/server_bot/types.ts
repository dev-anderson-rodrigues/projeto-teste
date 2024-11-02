export type CallbackData =
  | "cadastrar"
  | "ja_sou_cliente"
  | "agendar"
  | "reagendar"
  | "pagar"
  | "sair";

export type MessageResponse = {
  chatId: number;
  text: string | undefined;
};

export type Schedule = {
  name: string;
  email?: string;
  whatsapp: string;
  date: string;
  time: string;
  client: number;
};

export type Schedules = {
  id: string;
  schedules: Schedule; // Diretamente associando a um Schedule
}[];
export type Availability = {
  id: string;
  day: number | undefined;
  available: boolean;
  timeSlot: [
    {
      start: string;
      end: string;
    },
    {
      start: string;
      end: string;
    }
  ];
};
