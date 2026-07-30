"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { Campo, CampoConfig, Pipe, TipoCampo, TIPOS_CAMPO } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface CampoFormValues {
  tipo: TipoCampo;
  titulo: string;
  obrigatorio: boolean;
  descricao: string;
  textoAjuda: string;
  visualizacaoCompacta: boolean;
  config: CampoConfig;
}

const TIPOS_COM_OPCOES = new Set<TipoCampo>(["selecao_lista", "selecao_unica"]);

export function CampoConfigModal({
  open,
  onOpenChange,
  pipeId,
  campo,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeId: string;
  campo?: Campo;
  onSalvar: (values: CampoFormValues) => void;
}) {
  const [tipo, setTipo] = useState<TipoCampo>(campo?.tipo ?? "texto_curto");
  const [titulo, setTitulo] = useState(campo?.titulo ?? "");
  const [comDescricao, setComDescricao] = useState(Boolean(campo?.descricao));
  const [descricao, setDescricao] = useState(campo?.descricao ?? "");
  const [comAjuda, setComAjuda] = useState(Boolean(campo?.textoAjuda));
  const [textoAjuda, setTextoAjuda] = useState(campo?.textoAjuda ?? "");
  const [obrigatorio, setObrigatorio] = useState(campo?.obrigatorio ?? false);
  const [visualizacaoCompacta, setVisualizacaoCompacta] = useState(campo?.visualizacaoCompacta ?? false);
  const [opcoes, setOpcoes] = useState<string[]>(campo?.config.opcoes ?? []);
  const [novaOpcao, setNovaOpcao] = useState("");
  const [nomeConexao, setNomeConexao] = useState(campo?.config.nomeConexao ?? "");
  const [pipeDestinoId, setPipeDestinoId] = useState(campo?.config.pipeDestinoId ?? "");
  const [modoConexao, setModoConexao] = useState<"criar" | "pesquisar_criar">(
    campo?.config.modoConexao ?? "criar"
  );
  const [cardinalidade, setCardinalidade] = useState<"unico" | "varios">(
    campo?.config.cardinalidade ?? "varios"
  );
  const [pipes, setPipes] = useState<Pipe[]>([]);

  const [openAnterior, setOpenAnterior] = useState(open);
  if (open !== openAnterior) {
    setOpenAnterior(open);
    if (open) {
      setTipo(campo?.tipo ?? "texto_curto");
      setTitulo(campo?.titulo ?? "");
      setComDescricao(Boolean(campo?.descricao));
      setDescricao(campo?.descricao ?? "");
      setComAjuda(Boolean(campo?.textoAjuda));
      setTextoAjuda(campo?.textoAjuda ?? "");
      setObrigatorio(campo?.obrigatorio ?? false);
      setVisualizacaoCompacta(campo?.visualizacaoCompacta ?? false);
      setOpcoes(campo?.config.opcoes ?? []);
      setNomeConexao(campo?.config.nomeConexao ?? "Subtarefas (Cards Filhos)");
      setPipeDestinoId(campo?.config.pipeDestinoId ?? pipeId);
      setModoConexao(campo?.config.modoConexao ?? "criar");
      setCardinalidade(campo?.config.cardinalidade ?? "varios");
    }
  }

  useEffect(() => {
    if (!open || tipo !== "conexao_pipe") return;
    api.get<Pipe[]>("/api/pipes").then(setPipes).catch(() => {});
  }, [open, tipo]);

  function adicionarOpcao() {
    if (!novaOpcao.trim()) return;
    setOpcoes((prev) => [...prev, novaOpcao.trim()]);
    setNovaOpcao("");
  }

  function submit() {
    if (!titulo.trim()) return;
    const config: CampoConfig = {};
    if (TIPOS_COM_OPCOES.has(tipo)) config.opcoes = opcoes;
    if (tipo === "conexao_pipe") {
      config.nomeConexao = nomeConexao.trim() || "Conexão";
      config.pipeDestinoId = pipeDestinoId;
      config.modoConexao = modoConexao;
      config.cardinalidade = cardinalidade;
    }
    onSalvar({
      tipo,
      titulo: titulo.trim(),
      obrigatorio,
      descricao: comDescricao ? descricao : "",
      textoAjuda: comAjuda ? textoAjuda : "",
      visualizacaoCompacta,
      config,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {campo ? "Editar campo" : "Novo campo"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="titulo-campo">Título do campo</Label>
            <Input id="titulo-campo" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Escolha o tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoCampo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_CAMPO.map((t) => (
                  <SelectItem key={t.tipo} value={t.tipo}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {TIPOS_COM_OPCOES.has(tipo) && (
            <div className="flex flex-col gap-1.5">
              <Label>Opções</Label>
              <div className="flex flex-wrap gap-1.5">
                {opcoes.map((o) => (
                  <span
                    key={o}
                    className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                  >
                    {o}
                    <button onClick={() => setOpcoes((prev) => prev.filter((op) => op !== o))}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova opção"
                  value={novaOpcao}
                  onChange={(e) => setNovaOpcao(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adicionarOpcao()}
                />
                <Button size="sm" onClick={adicionarOpcao}>
                  Adicionar
                </Button>
              </div>
            </div>
          )}

          {tipo === "conexao_pipe" && (
            <div className="flex flex-col gap-3 rounded-md border border-slate-200 p-3">
              <div className="flex flex-col gap-1.5">
                <Label>Nome da conexão</Label>
                <Input value={nomeConexao} onChange={(e) => setNomeConexao(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Pipe de destino</Label>
                <Select value={pipeDestinoId} onValueChange={setPipeDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pipes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Ação da conexão</Label>
                <div className="flex gap-1.5 text-xs">
                  <button
                    onClick={() => setModoConexao("criar")}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-medium",
                      modoConexao === "criar" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    Criar novos cards
                  </button>
                  <button
                    onClick={() => setModoConexao("pesquisar_criar")}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-medium",
                      modoConexao === "pesquisar_criar"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    Pesquisar e criar
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Número de cards conectáveis</Label>
                <div className="flex gap-1.5 text-xs">
                  <button
                    onClick={() => setCardinalidade("unico")}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-medium",
                      cardinalidade === "unico" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    Um único card
                  </button>
                  <button
                    onClick={() => setCardinalidade("varios")}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-medium",
                      cardinalidade === "varios" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    Vários cards
                  </button>
                </div>
              </div>
            </div>
          )}

          <label className="flex cursor-pointer items-center justify-between text-sm text-slate-700">
            Descrição
            <Checkbox checked={comDescricao} onCheckedChange={(v) => setComDescricao(Boolean(v))} />
          </label>
          {comDescricao && (
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do campo" />
          )}

          <label className="flex cursor-pointer items-center justify-between text-sm text-slate-700">
            Texto de ajuda
            <Checkbox checked={comAjuda} onCheckedChange={(v) => setComAjuda(Boolean(v))} />
          </label>
          {comAjuda && (
            <Input value={textoAjuda} onChange={(e) => setTextoAjuda(e.target.value)} placeholder="Texto de ajuda" />
          )}

          <label className="flex cursor-pointer items-center justify-between text-sm text-slate-700">
            Este campo é obrigatório
            <Checkbox checked={obrigatorio} onCheckedChange={(v) => setObrigatorio(Boolean(v))} />
          </label>

          <label className="flex cursor-pointer items-center justify-between text-sm text-slate-700">
            Visualização compacta
            <Checkbox
              checked={visualizacaoCompacta}
              onCheckedChange={(v) => setVisualizacaoCompacta(Boolean(v))}
            />
          </label>

          <button
            type="button"
            className="self-start text-xs text-blue-600 hover:underline"
            onClick={(e) => e.preventDefault()}
          >
            Dependências do campo
          </button>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
