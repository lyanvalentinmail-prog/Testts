/** Almacén temporal de notas para demostrar un CRUD REST real (sin base de datos). */
import { randomUUID } from 'node:crypto';
import { ApiError } from '../lib/errors.js';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const notes = new Map<string, Note>();
const MAX_NOTES = 200;

function seed(): void {
  if (notes.size > 0) return;
  const now = new Date().toISOString();
  const examples: Array<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      title: 'Bienvenido a Velora API',
      content: 'Este almacén vive en memoria: demuestra POST, PUT y DELETE sin base de datos.',
      tags: ['demo', 'api'],
    },
    {
      title: 'Canvas con plantillas reales',
      content: 'Los 34 canvas usan las imágenes originales de la carpeta CategoriaCanvas.',
      tags: ['canvas'],
    },
  ];
  for (const example of examples) {
    const id = randomUUID();
    notes.set(id, { id, ...example, createdAt: now, updatedAt: now });
  }
}

export interface NoteInput {
  title?: unknown;
  content?: unknown;
  tags?: unknown;
}

const TAG_RE = /^[a-z0-9-]{1,20}$/;

/** Valida el cuerpo de una nota con mensajes de error por campo. */
export function parseNoteInput(input: NoteInput): { title: string; content: string; tags: string[] } {
  const errors: Array<{ field: string; message: string }> = [];

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) errors.push({ field: 'title', message: 'es obligatorio' });
  else if (title.length > 80) errors.push({ field: 'title', message: 'no puede superar los 80 caracteres' });

  const content = input.content === undefined ? '' : String(input.content);
  if (content.length > 2000) errors.push({ field: 'content', message: 'no puede superar los 2000 caracteres' });

  let tags: string[] = [];
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) errors.push({ field: 'tags', message: 'debe ser una lista de cadenas' });
    else {
      tags = input.tags.map((tag) => String(tag).toLowerCase());
      if (tags.length > 5) errors.push({ field: 'tags', message: 'máximo 5 etiquetas' });
      for (const tag of tags) {
        if (!TAG_RE.test(tag)) errors.push({ field: 'tags', message: `la etiqueta «${tag}» solo admite a-z, 0-9 y guiones (máx. 20)` });
      }
    }
  }

  if (errors.length) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'El cuerpo de la nota no es válido.', {
      details: errors,
      hint: 'title es obligatorio (1-80), content hasta 2000 y tags hasta 5 en minúsculas.',
    });
  }

  return { title, content, tags };
}

export const notesStore = {
  list(tag?: string, limit = 20): Note[] {
    seed();
    const all = [...notes.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const filtered = tag ? all.filter((note) => note.tags.includes(tag.toLowerCase())) : all;
    return filtered.slice(0, limit);
  },

  get(id: string): Note {
    seed();
    const note = notes.get(id);
    if (!note) throw ApiError.notFound(`No existe la nota «${id}».`, { pista: 'Lista las notas con GET /api/utils/notes' });
    return note;
  },

  create(input: ReturnType<typeof parseNoteInput>): Note {
    seed();
    if (notes.size >= MAX_NOTES) throw ApiError.badRequest('El almacén de demostración está lleno (200 notas).');
    const now = new Date().toISOString();
    const note: Note = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
    notes.set(note.id, note);
    return note;
  },

  update(id: string, input: ReturnType<typeof parseNoteInput>): Note {
    const existing = this.get(id);
    const updated: Note = { ...existing, ...input, updatedAt: new Date().toISOString() };
    notes.set(id, updated);
    return updated;
  },

  remove(id: string): Note {
    const existing = this.get(id);
    notes.delete(id);
    return existing;
  },

  clear(): void {
    notes.clear();
  },

  count(): number {
    return notes.size;
  },
};
