import type { Field } from "./ui";

export const songFields: Field[] = [
  { name: "titulo", label: "Título", required: true },
  { name: "artista", label: "Artista original" },
  { name: "tom", label: "Tom (da Jana)", placeholder: "Ex: A, F#m" },
  { name: "bpm", label: "BPM", type: "number" },
  { name: "youtube_url", label: "Link YouTube (versão original)", type: "url" },
  { name: "observacoes", label: "Observações (emendas, breques, convenções)", type: "textarea" },
];

export const blockFields: Field[] = [
  { name: "nome", label: "Nome do bloco (opcional)", placeholder: "Ex: Axé Retrô, Lentas" },
  { name: "duracao", label: "Duração", placeholder: "Ex: 12:30" },
  { name: "observacoes", label: "Observações", type: "textarea" },
];

export const videoFields: Field[] = [
  { name: "titulo", label: "Título", required: true },
  { name: "youtube_url", label: "Link do YouTube", type: "url", required: true },
  { name: "data_show", label: "Data do show", type: "date" },
];

export const showFields: Field[] = [
  { name: "nome", label: "Nome do evento", required: true },
  { name: "data", label: "Data", type: "date", required: true },
  { name: "local", label: "Cidade / local" },
  { name: "endereco", label: "Endereço" },
  { name: "horario_saida", label: "Horário de saída", type: "time" },
  { name: "horario_passagem", label: "Passagem de som", type: "time" },
  { name: "horario_palco", label: "Horário de palco", type: "time" },
  { name: "duracao", label: "Duração", placeholder: "Ex: 2h" },
  { name: "traje", label: "Traje" },
  { name: "observacoes", label: "Observações", type: "textarea" },
];

export const rehearsalFields: Field[] = [
  { name: "data", label: "Data", type: "date", required: true },
  { name: "horario", label: "Horário", type: "time" },
  { name: "local", label: "Local" },
  { name: "observacoes", label: "Observações", type: "textarea" },
];
