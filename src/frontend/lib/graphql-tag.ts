export function graphql(template: TemplateStringsArray, ...expressions: readonly any[]) {
  const [head, ...spans] = template;
  if (!head) return '';
  let ret: string = head;
  for (let i = 0; i < expressions.length; i++) {
    ret += expressions[i] + spans[i];
  }
  return ret;
}
