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
import { Button, Card, CardContent, CardHeader, CardTitle, Input, toast } from "@nexora/ui";
import Link from "next/link";
import { GripVertical, Plus, Trash2, ChevronDown, ChevronRight, Video } from "lucide-react";
import {
  createModuleAction,
  deleteModuleAction,
  reorderModulesAction,
  createLessonAction,
  deleteLessonAction,
} from "@/actions/courses";
import type { LessonType } from "@nexora/db";

type Lesson = { id: string; title: string; type: LessonType; position: number };
type Module = { id: string; title: string; position: number; lessons: Lesson[] };

interface Props {
  courseId: string;
  modules: Module[];
}

export function CourseModulesEditor({ courseId, modules: initialModules }: Props) {
  const [modules, setModules] = useState(initialModules);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(initialModules.map((m) => m.id)));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(modules, oldIndex, newIndex);
    setModules(reordered);

    startTransition(async () => {
      await reorderModulesAction(courseId, reordered.map((m) => m.id));
    });
  }

  function addModule() {
    if (!newModuleTitle.trim()) return;
    const title = newModuleTitle.trim();
    setNewModuleTitle("");

    startTransition(async () => {
      const result = await createModuleAction(courseId, title);
      if ("error" in result) {
        toast({ variant: "destructive", title: "Erro", description: result.error });
        return;
      }
      setModules((prev) => [
        ...prev,
        { id: result.moduleId, title, position: prev.length + 1, lessons: [] },
      ]);
    });
  }

  function removeModule(moduleId: string) {
    if (!confirm("Excluir este módulo e todas as suas aulas?")) return;
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    startTransition(() => deleteModuleAction(courseId, moduleId));
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Módulos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            {modules.map((mod) => (
              <SortableModule
                key={mod.id}
                courseId={courseId}
                module={mod}
                expanded={expanded.has(mod.id)}
                onToggle={() => toggleExpanded(mod.id)}
                onDelete={() => removeModule(mod.id)}
                onLessonAdded={(lesson) =>
                  setModules((prev) =>
                    prev.map((m) => (m.id === mod.id ? { ...m, lessons: [...m.lessons, lesson] } : m)),
                  )
                }
                onLessonDeleted={(lessonId) =>
                  setModules((prev) =>
                    prev.map((m) =>
                      m.id === mod.id ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) } : m,
                    ),
                  )
                }
              />
            ))}
          </SortableContext>
        </DndContext>

        {modules.length === 0 && (
          <p className="py-6 text-center text-sm text-navy-400">
            Nenhum módulo ainda. Adicione o primeiro abaixo.
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Input
            placeholder="Nome do módulo"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addModule()}
            maxLength={200}
          />
          <Button onClick={addModule} disabled={isPending || !newModuleTitle.trim()} size="sm">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Módulo arrastável ────────────────────────────────────────────────────────

function SortableModule({
  courseId,
  module,
  expanded,
  onToggle,
  onDelete,
  onLessonAdded,
  onLessonDeleted,
}: {
  courseId: string;
  module: Module;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onLessonAdded: (lesson: Lesson) => void;
  onLessonDeleted: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<"VIDEO" | "PDF" | "TEXT" | "LINK" | "LIVE">("VIDEO");
  const [isPending, startTransition] = useTransition();

  function addLesson() {
    if (!newLessonTitle.trim()) return;
    const title = newLessonTitle.trim();
    const type = newLessonType;
    setNewLessonTitle("");
    startTransition(async () => {
      const result = await createLessonAction(courseId, module.id, { title, type });
      if ("error" in result) {
        toast({ variant: "destructive", title: "Erro", description: result.error });
        return;
      }
      onLessonAdded({ id: result.lessonId, title, type, position: module.lessons.length + 1 });
    });
  }

  function removeLesson(lessonId: string) {
    if (!confirm("Excluir esta aula?")) return;
    onLessonDeleted(lessonId);
    startTransition(() => deleteLessonAction(courseId, lessonId));
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-navy-100 bg-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-navy-300 hover:text-navy-500"
          aria-label="Arrastar módulo"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-navy-800"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-navy-400" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-navy-400" />}
          {module.title}
          <span className="ml-auto text-xs font-normal text-navy-400">
            {module.lessons.length} aula{module.lessons.length !== 1 ? "s" : ""}
          </span>
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-navy-300 hover:text-red-500 transition-colors"
          aria-label="Excluir módulo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-navy-50 px-3 pb-3 pt-2 space-y-1.5">
          {module.lessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-2 rounded-md bg-navy-50 px-3 py-1.5 text-sm">
              <span className="flex-1 text-navy-700">{lesson.title}</span>
              <span className="text-xs text-navy-400 uppercase">{lesson.type}</span>
              {lesson.type === "LIVE" && (
                <Link
                  href={`/admin/cursos/${courseId}/aulas/${lesson.id}/live` as never}
                  className="p-0.5 text-teal-500 hover:text-teal-700 transition-colors"
                  aria-label="Gerenciar aula ao vivo"
                >
                  <Video className="h-3 w-3" />
                </Link>
              )}
              <button
                onClick={() => removeLesson(lesson.id)}
                className="p-0.5 text-navy-300 hover:text-red-500 transition-colors"
                aria-label="Excluir aula"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <select
              value={newLessonType}
              onChange={(e) => setNewLessonType(e.target.value as typeof newLessonType)}
              className="h-8 rounded-md border border-navy-200 bg-white px-2 text-xs text-navy-700 shrink-0"
            >
              <option value="VIDEO">Vídeo</option>
              <option value="PDF">PDF / Arquivo</option>
              <option value="TEXT">Texto</option>
              <option value="LINK">Link externo</option>
              <option value="LIVE">Ao vivo</option>
            </select>
            <Input
              placeholder="Nome da aula"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLesson()}
              maxLength={200}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={addLesson}
              disabled={isPending || !newLessonTitle.trim()}
              className="h-8 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Aula
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
