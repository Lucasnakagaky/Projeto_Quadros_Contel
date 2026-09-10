import {
  AlignLeft,
  Calendar,
  CalendarClock,
  CheckSquare,
  CircleDot,
  CircleHelp,
  Clock,
  DollarSign,
  Database,
  FileText,
  Fingerprint,
  GitBranch,
  Hash,
  Link,
  ListChecks,
  Mail,
  Paperclip,
  PenLine,
  Phone,
  Tag,
  Type,
  User,
  type LucideIcon,
} from "lucide-react";
import { TipoCampo } from "@/lib/types";

const ICONS: Record<TipoCampo, LucideIcon> = {
  texto_curto: Type,
  texto_longo: AlignLeft,
  texto_formatado: PenLine,
  anexo: Paperclip,
  checkbox: CheckSquare,
  responsavel: User,
  data: Calendar,
  data_hora: Calendar,
  data_vencimento: CalendarClock,
  etiquetas: Tag,
  email: Mail,
  telefone: Phone,
  selecao_lista: ListChecks,
  selecao_unica: CircleDot,
  tempo: Clock,
  numerico: Hash,
  moeda: DollarSign,
  documentos: FileText,
  id: Fingerprint,
  conexao_pipe: GitBranch,
  conexao_database: Database,
  cards_vinculados: Link,
};

export function CampoIcon({ tipo, size = 14 }: { tipo: TipoCampo; size?: number }) {
  // Fallback para dados legados: um campo salvo com um `tipo` que não existe mais no union
  // (ex.: pipe antigo, db.json editado à mão) não pode derrubar o quadro inteiro.
  const Icone = ICONS[tipo] ?? CircleHelp;
  return <Icone size={size} className="shrink-0 text-slate-400" />;
}
