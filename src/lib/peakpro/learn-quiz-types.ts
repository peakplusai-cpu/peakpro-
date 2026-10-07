export type QuizCategory = 'indicator' | 'market' | 'general';

export type LocaleText = { zh: string; en: string };

export type PublicQuizItem = {
  id: string;
  category: QuizCategory;
  prompt: LocaleText;
  choices: LocaleText[];
};

export type QuizWrongItem = {
  id: string;
  index: number;
  prompt: LocaleText;
  picked: LocaleText | null;
  correct: LocaleText;
  explain: LocaleText;
};
