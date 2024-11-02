import * as Yup from "yup";
import { DateTime } from "luxon";
// Definindo o esquema de validação com Yup
export const scheduleSchema = Yup.object().shape({
  name: Yup.string()
    .matches(
      /^[a-zA-ZÀ-ÿ]+(\s+[a-zA-ZÀ-ÿ]+)+$/,
      "Por favor, digite o nome e o sobrenome"
    )
    .required("Nome é obrigatório"),

  email: Yup.string()
    .email(
      "E-mail inválido, caso não possua um email por favor coloque como no exemplo!"
    )
    .required("E-mail é obrigatório"),

  whatsapp: Yup.string()
    .matches(
      /^\d{2} \d{4,5}-\d{4}$/,
      "WhatsApp no formato inválido (ex: 11 94444-4444)"
    )
    .required("WhatsApp é obrigatório"),

  date: Yup.string()
    .matches(/^\d{2}-\d{2}-\d{4}$/, "Data inválida (ex: 30-10-2024)")
    .test(
      "is-valid-date",
      "Data inválida",
      (value) => DateTime.fromFormat(value!, "dd-MM-yyyy").isValid
    ),

  time: Yup.string()
    .matches(/^\d{2}:\d{2}$/, "Horário inválido (ex: 15:00)")
    .required("Horário é obrigatório"),
});
