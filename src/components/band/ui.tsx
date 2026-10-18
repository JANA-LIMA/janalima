import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, X, Clock, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-4", className)}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, ReactNode, string]> = {
    confirmado: ["Confirmado", <Check key="c" className="size-3" />, "bg-success/15 text-success"],
    recusado: ["Recusado", <X key="x" className="size-3" />, "bg-destructive/15 text-destructive"],
    pendente: ["Pendente", <Clock key="p" className="size-3" />, "bg-sun/15 text-sun"],
  };
  const [label, icon, cls] = map[status] ?? map.pendente;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", cls)}>
      {icon}
      {label}
    </span>
  );
}

export function ConfirmButtons({ status, onSet }: { status: string; onSet: (s: string) => void }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant={status === "confirmado" ? "hero" : "outline"} onClick={() => onSet("confirmado")}>
        <Check /> Vou
      </Button>
      <Button size="sm" variant={status === "recusado" ? "destructive" : "outline"} onClick={() => onSet("recusado")}>
        <X /> Não vou
      </Button>
    </div>
  );
}

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "time" | "select" | "email" | "url" | "checkbox";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
};

type Values = Record<string, unknown>;

export function FormDialog({
  trigger,
  title,
  fields,
  initial,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  fields: Field[];
  initial?: Values;
  onSubmit: (v: Values) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Values>(initial ?? {});
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setVals((p) => ({ ...p, [k]: v }));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setVals(initial ?? {});
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const out: Values = {};
              for (const f of fields) {
                const v = vals[f.name];
                if (f.type === "checkbox") out[f.name] = !!v;
                else if (f.type === "number") out[f.name] = v === "" || v == null ? null : Number(v);
                else out[f.name] = v === "" || v == null ? null : v;
              }
              await onSubmit(out);
              setOpen(false);
              toast.success("Salvo!");
            } catch (err) {
              toast.error((err as Error).message ?? "Erro ao salvar");
            } finally {
              setBusy(false);
            }
          }}
        >
          {fields.map((f) => {
            const v = (vals[f.name] ?? "") as string;
            return (
              <div key={f.name} className="space-y-1">
                {f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!vals[f.name]}
                      onChange={(e) => set(f.name, e.target.checked)}
                      className="size-4 accent-primary"
                    />
                    {f.label}
                  </label>
                ) : (
                  <>
                    <Label>{f.label}</Label>
                    {f.type === "textarea" ? (
                      <Textarea value={v} onChange={(e) => set(f.name, e.target.value)} rows={3} />
                    ) : f.type === "select" ? (
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={v}
                        required={f.required}
                        onChange={(e) => set(f.name, e.target.value)}
                      >
                        <option value="">Selecione…</option>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={f.type ?? "text"}
                        value={v}
                        required={f.required}
                        placeholder={f.placeholder}
                        onChange={(e) => set(f.name, e.target.value)}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SortRow({ id, children, disabled }: { id: string; children: ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-xl border bg-card p-2.5", isDragging && "z-10 border-primary shadow-glow")}
    >
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab p-1 text-muted-foreground"
          aria-label="Arrastar"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export function SortableList<T extends { id: string }>({
  items,
  render,
  onReorder,
  disabled,
}: {
  items: T[];
  render: (item: T, index: number) => ReactNode;
  onReorder: (items: T[]) => void;
  disabled?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );
  const onEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    onReorder(arrayMove(items, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <SortRow key={it.id} id={it.id} disabled={disabled}>
              {render(it, i)}
            </SortRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export function YouTube({ src, title }: { src: string | null; title: string }) {
  if (!src) return null;
  return (
    <div className="aspect-video overflow-hidden rounded-xl border bg-muted">
      <iframe
        key={src}
        src={src}
        title={title}
        className="size-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
