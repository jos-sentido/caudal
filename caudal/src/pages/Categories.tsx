import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { IconBubble, Sheet, Field, inputCls, Btn, Segmented, TopBar } from '../components/ui'
import { IconPicker, ColorPicker } from '../components/pickers'
import type { Category, CategoryKind } from '../lib/types'

export function Categories() {
  const s = useStore()
  const nav = useNavigate()
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [edit, setEdit] = useState<Category | 'new' | null>(null)

  const list = s.categories.filter((c) => c.kind === kind).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <TopBar
        title="Categorías"
        back={() => nav(-1)}
        right={
          <button onClick={() => setEdit('new')} className="w-9 h-9 grid place-items-center rounded-full bg-brand text-white">
            <Plus size={19} />
          </button>
        }
      />
      <div className="px-4">
        <div className="mb-4">
          <Segmented<CategoryKind>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'expense', label: 'Gastos', color: 'var(--color-expense)' },
              { value: 'income', label: 'Ingresos', color: 'var(--color-income)' },
            ]}
          />
        </div>
        <div className="bg-surface rounded-2xl px-3 divide-y divide-line/40">
          {list.map((c) => (
            <button key={c.id} onClick={() => setEdit(c)} className="flex items-center gap-3 w-full py-3 text-left">
              <IconBubble color={c.color} icon={c.icon} size={40} iconSize={18} />
              <span className="flex-1 font-medium">{c.name}</span>
              <ChevronRight size={18} className="text-faint" />
            </button>
          ))}
          {list.length === 0 && <div className="py-8 text-center text-muted text-sm">Sin categorías</div>}
        </div>
      </div>

      {edit && <CategoryModal category={edit === 'new' ? null : edit} defaultKind={kind} onClose={() => setEdit(null)} />}
    </div>
  )
}

function CategoryModal({ category, defaultKind, onClose }: { category: Category | null; defaultKind: CategoryKind; onClose: () => void }) {
  const s = useStore()
  const [name, setName] = useState(category?.name ?? '')
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? defaultKind)
  const [color, setColor] = useState(category?.color ?? '#7c5cff')
  const [icon, setIcon] = useState(category?.icon ?? 'tag')

  const save = () => {
    const data = { name: name.trim(), kind, color, icon }
    if (!data.name) return
    if (category) s.updateCategory(category.id, data)
    else s.addCategory(data)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      footer={
        <div className="flex gap-3">
          {category && (
            <button onClick={() => { s.deleteCategory(category.id); onClose() }} className="grid place-items-center w-12 h-12 rounded-xl bg-expense/15 text-expense shrink-0">
              <Trash2 size={18} />
            </button>
          )}
          <Btn onClick={save} disabled={!name.trim()}>{category ? 'Guardar' : 'Crear'}</Btn>
        </div>
      }
    >
      <div className="flex justify-center py-3">
        <IconBubble color={color} icon={icon} size={64} iconSize={28} />
      </div>
      <Field label="Nombre">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Hogar, Nómina…" />
      </Field>
      <Field label="Tipo">
        <Segmented<CategoryKind>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'Gasto', color: 'var(--color-expense)' },
            { value: 'income', label: 'Ingreso', color: 'var(--color-income)' },
          ]}
        />
      </Field>
      <div className="h-3" />
      <Field label="Color"><ColorPicker value={color} onChange={setColor} /></Field>
      <Field label="Ícono"><IconPicker value={icon} onChange={setIcon} /></Field>
    </Sheet>
  )
}
