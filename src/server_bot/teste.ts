import { sendToApiGet } from "../services";
import { Schedules } from "./types";
const schedules = {
  name: "Anderson Rodrigues",
  client: 1154098884,
  email: "andersoncassio2008@gmail.com",
};
const response = sendToApiGet("http://localhost:5000/agendamentos", {
  schedules,
}).then(async (response: Schedules) => {
  const data = await response.filter(
    (r) =>
      (r.schedules.name.toLowerCase() === schedules.name &&
        r.schedules.client === schedules.client) ||
      (r.schedules.email.toLowerCase() === schedules.email &&
        r.schedules.client === schedules.client)
  );
  console.log(data);
});
