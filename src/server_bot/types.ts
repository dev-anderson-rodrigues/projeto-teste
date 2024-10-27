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

export type Schedules = {
  name: string;
  data: string;
  time: string;
  client: number;
};
