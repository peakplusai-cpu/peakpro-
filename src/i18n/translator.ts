export type MessageValue = string | string[] | MessageTree;
export type MessageTree = { [key: string]: MessageValue };

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

export function createTranslator(messages: MessageTree): Translator {
  return (key, vars) => {
    const value = getNestedString(messages, key);
    if (value === undefined) return key;
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(vars[name] ?? `{${name}}`),
    );
  };
}

function getNestedValue(messages: MessageTree, key: string): MessageValue | undefined {
  const parts = key.split('.');
  let node: MessageValue | undefined = messages;

  for (const part of parts) {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) {
      return undefined;
    }
    node = node[part];
  }

  return node;
}

function getNestedString(messages: MessageTree, key: string): string | undefined {
  const node = getNestedValue(messages, key);
  return typeof node === 'string' ? node : undefined;
}

export function getMessageArray(messages: MessageTree, key: string): string[] {
  const node = getNestedValue(messages, key);
  if (!Array.isArray(node)) return [];
  return node.filter((item): item is string => typeof item === 'string');
}
