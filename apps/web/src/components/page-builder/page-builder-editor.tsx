"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from "@nexora/ui";
import { GripVertical, Trash2, Plus, Eye, Pencil, Save, Rocket, History } from "lucide-react";
import type { LayoutBlock, BlockType } from "@nexora/validators";
import { BLOCK_LABELS, BLOCK_PALETTE, makeBlock } from "./block-meta";
import { BlockView } from "./block-view";
import { saveDraftAction, publishLayoutAction, rollbackLayoutAction } from "@/actions/layouts";
import { useConfirm } from "@/hooks/use-confirm";

interface VersionRow {
  id: string;
  version: number;
  publishedAt: Date | string | null;
  updatedBy: string;
  updatedAt: Date | string;
}

interface Props {
  pageType: string;
  initialBlocks: LayoutBlock[];
  source: "draft" | "published" | "empty";
  versions: VersionRow[];
}

export function PageBuilderEditor({ pageType, initialBlocks, source, versions }: Props) {
  const [blocks, setBlocks] = useState<LayoutBlock[]>(initialBlocks);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function mutate(next: LayoutBlock[]) {
    setBlocks(next);
    setDirty(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    mutate(arrayMove(blocks, oldIndex, newIndex));
  }

  function addBlock(type: BlockType) {
    mutate([...blocks, makeBlock(type)]);
  }

  function removeBlock(id: string) {
    mutate(blocks.filter((b) => b.id !== id));
  }

  function patchBlock(id: string, partial: Record<string, unknown>) {
    mutate(blocks.map((b) => (b.id === id ? ({ ...b, ...partial } as LayoutBlock) : b)));
  }

  function saveDraft() {
    startTransition(async () => {
      const r = await saveDraftAction(pageType, blocks);
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro ao salvar", description: r.error });
        return;
      }
      setDirty(false);
      toast({ title: "Rascunho salvo" });
    });
  }

  async function publish() {
    if (!await confirm({ title: "Publicar página", description: "Publicar esta versão? Ela ficará visível na página pública.", confirmLabel: "Publicar" })) return;
    startTransition(async () => {
      const r = await publishLayoutAction(pageType, blocks);
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro ao publicar", description: r.error });
        return;
      }
      setDirty(false);
      toast({ title: `Publicado (v${r.version})` });
    });
  }

  async function rollback(version: number) {
    if (!await confirm({ title: "Restaurar versão", description: `Restaurar a versão ${version}? Ela será republicada como nova versão.`, confirmLabel: "Restaurar" })) return;
    startTransition(async () => {
      const r = await rollbackLayoutAction(pageType, version);
      if (r?.error) {
        toast({ variant: "destructive", title: "Erro", description: r.error });
        return;
      }
      toast({ title: `Versão ${version} restaurada (v${r.version})` });
    });
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-navy-100 bg-white p-3">
        <div className="flex rounded-md border border-navy-100 p-0.5">
          <button
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${mode === "edit" ? "bg-navy-100 text-navy-900" : "text-navy-500"}`}
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <button
            onClick={() => setMode("preview")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${mode === "preview" ? "bg-navy-100 text-navy-900" : "text-navy-500"}`}
          >
            <Eye className="h-3.5 w-3.5" /> Pré-visualizar
          </button>
        </div>

        <span className="text-xs text-navy-400">
          {dirty ? "Alterações não salvas" : source === "empty" ? "Página vazia" : `Editando ${source === "draft" ? "rascunho" : "última publicada"}`}
        </span>

        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={saveDraft} disabled={isPending}>
            <Save className="h-4 w-4" /> Salvar rascunho
          </Button>
          <Button size="sm" onClick={publish} disabled={isPending || blocks.length === 0}>
            <Rocket className="h-4 w-4" /> Publicar
          </Button>
        </div>
      </div>

      {mode === "preview" ? (
        <div className="overflow-hidden rounded-lg border border-navy-100 bg-white">
          {blocks.length === 0 ? (
            <p className="p-12 text-center text-navy-400">Nada para pré-visualizar.</p>
          ) : (
            blocks.map((b) => <BlockView key={b.id} block={b} courses={[]} />)
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          {/* Coluna de edição */}
          <div className="space-y-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    onPatch={(p) => patchBlock(block.id, p)}
                    onRemove={() => removeBlock(block.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {blocks.length === 0 && (
              <p className="rounded-lg border border-dashed border-navy-200 py-10 text-center text-sm text-navy-400">
                Nenhum bloco ainda. Adicione um pela paleta ao lado.
              </p>
            )}
          </div>

          {/* Paleta + histórico */}
          <div className="space-y-4">
            <div className="rounded-lg border border-navy-100 bg-white p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-navy-400">
                <Plus className="h-3.5 w-3.5" /> Adicionar bloco
              </p>
              <div className="space-y-1">
                {BLOCK_PALETTE.map((type) => (
                  <button
                    key={type}
                    onClick={() => addBlock(type)}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-navy-700 transition hover:bg-teal-50 hover:text-teal-700"
                  >
                    {BLOCK_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-navy-100 bg-white p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-navy-400">
                <History className="h-3.5 w-3.5" /> Versões publicadas
              </p>
              {versions.length === 0 ? (
                <p className="text-xs text-navy-400">Nenhuma versão publicada ainda.</p>
              ) : (
                <ul className="space-y-1">
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-2 rounded-md bg-navy-50 px-2.5 py-1.5 text-xs">
                      <span className="text-navy-700">
                        v{v.version}
                        <span className="ml-1 text-navy-400">
                          {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString("pt-BR") : ""}
                        </span>
                      </span>
                      <button
                        onClick={() => rollback(v.version)}
                        disabled={isPending}
                        className="text-teal-600 hover:text-teal-800 disabled:opacity-50"
                      >
                        Restaurar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bloco arrastável + formulário ──────────────────────────────────────────

function SortableBlock({
  block,
  onPatch,
  onRemove,
}: {
  block: LayoutBlock;
  onPatch: (partial: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-navy-100 bg-white">
      <div className="flex items-center gap-2 border-b border-navy-50 px-3 py-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-navy-300 hover:text-navy-500"
          aria-label="Arrastar bloco"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="flex-1 text-sm font-medium text-navy-800">{BLOCK_LABELS[block.type]}</span>
        <button onClick={onRemove} className="p-1 text-navy-300 transition-colors hover:text-red-500" aria-label="Remover bloco">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-3 p-3">
        <BlockForm block={block} onPatch={onPatch} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-navy-500">{label}</Label>
      {children}
    </div>
  );
}

function BlockForm({ block, onPatch }: { block: LayoutBlock; onPatch: (p: Record<string, unknown>) => void }) {
  switch (block.type) {
    case "hero":
      return (
        <>
          <Field label="Título"><Input value={block.title} maxLength={160} onChange={(e) => onPatch({ title: e.target.value })} /></Field>
          <Field label="Subtítulo"><Input value={block.subtitle} maxLength={400} onChange={(e) => onPatch({ subtitle: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Texto do botão"><Input value={block.ctaText} maxLength={60} onChange={(e) => onPatch({ ctaText: e.target.value })} /></Field>
            <Field label="Link do botão"><Input value={block.ctaHref} placeholder="/login" onChange={(e) => onPatch({ ctaHref: e.target.value })} /></Field>
          </div>
          <Field label="Cor de fundo"><input type="color" value={block.bgColor} onChange={(e) => onPatch({ bgColor: e.target.value })} className="h-9 w-16 rounded border border-navy-200" /></Field>
        </>
      );

    case "richText":
      return (
        <Field label="HTML (texto, negrito, links, listas)">
          <Textarea value={block.html} rows={5} maxLength={20000} onChange={(e) => onPatch({ html: e.target.value })} />
        </Field>
      );

    case "featureGrid":
      return (
        <>
          <Field label="Título da seção"><Input value={block.title} maxLength={160} onChange={(e) => onPatch({ title: e.target.value })} /></Field>
          <div className="space-y-2">
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-2 rounded-md bg-navy-50 p-2">
                <div className="flex-1 space-y-1">
                  <Input value={item.title} placeholder="Título" maxLength={120} onChange={(e) => {
                    const items = block.items.map((it, j) => (j === i ? { ...it, title: e.target.value } : it));
                    onPatch({ items });
                  }} />
                  <Input value={item.text} placeholder="Descrição" maxLength={400} onChange={(e) => {
                    const items = block.items.map((it, j) => (j === i ? { ...it, text: e.target.value } : it));
                    onPatch({ items });
                  }} />
                </div>
                <button
                  onClick={() => onPatch({ items: block.items.filter((_, j) => j !== i) })}
                  disabled={block.items.length <= 1}
                  className="text-navy-300 hover:text-red-500 disabled:opacity-30"
                  aria-label="Remover item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPatch({ items: [...block.items, { title: "Recurso", text: "" }] })}
              disabled={block.items.length >= 12}
            >
              <Plus className="h-3.5 w-3.5" /> Item
            </Button>
          </div>
        </>
      );

    case "courseList":
      return (
        <>
          <Field label="Título"><Input value={block.title} maxLength={160} onChange={(e) => onPatch({ title: e.target.value })} /></Field>
          <Field label="Quantidade máxima">
            <Input type="number" min={1} max={24} value={block.limit} onChange={(e) => onPatch({ limit: Math.max(1, Math.min(24, Number(e.target.value) || 1)) })} />
          </Field>
        </>
      );

    case "cta":
      return (
        <>
          <Field label="Título"><Input value={block.title} maxLength={160} onChange={(e) => onPatch({ title: e.target.value })} /></Field>
          <Field label="Texto"><Input value={block.text} maxLength={400} onChange={(e) => onPatch({ text: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Texto do botão"><Input value={block.buttonText} maxLength={60} onChange={(e) => onPatch({ buttonText: e.target.value })} /></Field>
            <Field label="Link do botão"><Input value={block.buttonHref} placeholder="/login" onChange={(e) => onPatch({ buttonHref: e.target.value })} /></Field>
          </div>
          <Field label="Cor de fundo"><input type="color" value={block.bgColor} onChange={(e) => onPatch({ bgColor: e.target.value })} className="h-9 w-16 rounded border border-navy-200" /></Field>
        </>
      );

    case "image":
      return (
        <>
          <Field label="URL da imagem"><Input value={block.src} placeholder="https://..." onChange={(e) => onPatch({ src: e.target.value })} /></Field>
          <Field label="Texto alternativo"><Input value={block.alt} maxLength={200} onChange={(e) => onPatch({ alt: e.target.value })} /></Field>
        </>
      );

    case "spacer":
      return (
        <Field label="Tamanho">
          <Select value={block.size} onValueChange={(v) => onPatch({ size: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Pequeno</SelectItem>
              <SelectItem value="md">Médio</SelectItem>
              <SelectItem value="lg">Grande</SelectItem>
              <SelectItem value="xl">Extra grande</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      );
  }
}
