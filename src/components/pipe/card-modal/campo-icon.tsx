import {
  AlignLeft,
  Calendar,
  CalendarClock,
  CheckSquare,
  CircleDot,
  Clock,
  DollarSign,
  Database,
  FileText,
  Fingerprint,
  GitBranch,
  Hash,
  ListChecks,
  Mail,
  Paperclip,
  PenLine,
  Phone,
  Sparkles,
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
  conteudo_dinamico: Sparkles,
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
};

export function CampoIcon({ tipo, size = 14 }: { tipo: TipoCampo; size?: number }) {
  const Icone = ICONS[tipo];
  return <Icone size={size} className="shrink-0 text-slate-400" />;
}
