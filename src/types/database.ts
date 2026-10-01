// Tipos das tabelas (ver supabase/migrations). Mantidos à mão por agora;
// podem ser gerados com `supabase gen types typescript`.

export type Deck = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

/** 0 = New, 1 = Learning, 2 = Review, 3 = Relearning (enum State do ts-fsrs) */
export type CardState = 0 | 1 | 2 | 3;

export type CardRow = {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: CardState;
  last_review: string | null;
  created_at: string;
};
