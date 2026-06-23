"use client";

import { useState, useTransition } from "react";
import { Button, Input, Label, toast } from "@nexora/ui";
import { Plus, Trash2, UserCog, Mail, Phone, Link2, Link2Off, ChevronDown } from "lucide-react";
import {
  createProfessorAction,
  deleteProfessorAction,
  linkProfessorUserAction,
  unlinkProfessorUserAction,
} from "@/actions/professores";
import { useConfirm } from "@/hooks/use-confirm";

interface Vinculo { turmaCode: string; disciplinaName: string }
interface LinkedUser { id: string; name: string; email: string | null }
interface Professor {
  id: string; name: string; email: string | null; phone: string | null;
  linkedUser: LinkedUser | null; vinculos: Vinculo[];
}
interface AvailableUser { id: string; name: string; email: string | null }

export function ProfessoresManager({
  initial,
  users,
}: {
  initial: Professor[];
  users: AvailableUser[];
}) {
  const [open, setOpen] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [ConfirmDialog, confirm] = useConfirm();

  // Users not yet linked to any professor
  const linkedUserIds = new Set(initial.map((p) => p.linkedUser?.id).filter(Boolean));
  function availableFor(prof: Professor) {
    return users.filter((u) => u.id === prof.linkedUser?.id || !linkedUserIds.has(u.id));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createProfessorAction(fd);
      if ("error" in r) { toast({ variant: "destructive", title: "Erro", description: r.error }); return; }
      toast({ title: "Professor cadastrado" });
      setOpen(false);
      window.location.reload();
    });
  }

  async function remove(id: string, name: string, nVinculos: number) {
    const ok = await confirm({
      title: `Excluir ${name}?`,
      description: nVinculos > 0
        ? `Este professor está vinculado a ${nVinculos} disciplina(s) — os vínculos serão removidos.`
        : "O professor será removido.",
      confirmVariant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => { await deleteProfessorAction(id); window.location.reload(); });
  }

  function startLink(profId: string) {
    setLinkingId(profId);
    setSelectedUserId("");
  }

  function saveLink(profId: string) {
    if (!selectedUserId) return;
    startTransition(async () => {
      await linkProfessorUserAction(profId, selectedUserId);
      toast({ title: "Usuário vinculado" });
      setLinkingId(null);
      window.location.reload();
    });
  }

  function unlink(profId: string, userName: string) {
    startTransition(async () => {
      await unlinkProfessorUserAction(profId);
      toast({ title: `Vínculo com ${userName} removido` });
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />

      {!open ? (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Cadastrar professor
        </Button>
      ) : (
        <form onSubmit={submit} className="rounded-lg border border-navy-100 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-navy-900">Novo professor</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor="p-name" className="text-xs">Nome</Label>
              <Input id="p-name" name="name" required maxLength={120} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-email" className="text-xs">Email (opcional)</Label>
              <Input id="p-email" name="email" type="email" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-phone" className="text-xs">Telefone (opcional)</Label>
              <Input id="p-phone" name="phone" type="tel" maxLength={20} />
            </div>
          </div>
          <p className="text-xs text-navy-400">Após cadastrar, vincule um usuário com papel Professor para habilitar o login.</p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>Cadastrar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {initial.length === 0 ? (
        <p className="text-sm text-navy-400">Nenhum professor cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {initial.map((p) => (
            <div key={p.id} className="rounded-lg border border-navy-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900 flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-teal-500 shrink-0" /> {p.name}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    {p.email && <span className="flex items-center gap-1 text-xs text-navy-400"><Mail className="h-3 w-3" /> {p.email}</span>}
                    {p.phone && <span className="flex items-center gap-1 text-xs text-navy-400"><Phone className="h-3 w-3" /> {p.phone}</span>}
                  </div>

                  {/* Login link section */}
                  <div className="mt-3">
                    {p.linkedUser ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full">
                          <Link2 className="h-3 w-3" />
                          Login: {p.linkedUser.name}
                          {p.linkedUser.email && <span className="opacity-70">· {p.linkedUser.email}</span>}
                        </span>
                        <button
                          onClick={() => unlink(p.id, p.linkedUser!.name)}
                          disabled={isPending}
                          className="flex items-center gap-1 text-xs text-navy-400 hover:text-red-500"
                        >
                          <Link2Off className="h-3 w-3" /> Desvincular
                        </button>
                      </div>
                    ) : linkingId === p.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="appearance-none rounded border border-navy-200 bg-white px-3 py-1.5 pr-7 text-xs text-navy-800 focus:outline-none focus:ring-1 focus:ring-teal-400"
                          >
                            <option value="">Selecionar usuário...</option>
                            {availableFor(p).map((u) => (
                              <option key={u.id} value={u.id}>{u.name}{u.email ? ` (${u.email})` : ""}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-navy-400" />
                        </div>
                        <Button size="sm" onClick={() => saveLink(p.id)} disabled={!selectedUserId || isPending} className="h-7 text-xs px-3">
                          Vincular
                        </Button>
                        <button onClick={() => setLinkingId(null)} className="text-xs text-navy-400 hover:text-navy-600">Cancelar</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startLink(p.id)}
                        disabled={isPending}
                        className="flex items-center gap-1 text-xs text-navy-400 hover:text-teal-600 border border-dashed border-navy-200 hover:border-teal-300 rounded px-2 py-1"
                      >
                        <Link2 className="h-3 w-3" /> Vincular login
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => remove(p.id, p.name, p.vinculos.length)}
                  disabled={isPending}
                  className="p-1 text-navy-300 hover:text-red-500 shrink-0"
                  aria-label={`Excluir ${p.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {p.vinculos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.vinculos.map((v, i) => (
                    <span key={i} className="rounded bg-navy-50 px-2 py-1 text-xs text-navy-700">
                      <span className="font-mono">{v.turmaCode}</span> · {v.disciplinaName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
