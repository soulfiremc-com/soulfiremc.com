export type ApiSource = { file: string; line: number };

export type ApiParameter = {
  name: string;
  type: string;
  optional: boolean;
  default?: string;
  defaultFactory?: string;
  description?: string;
  kind?: string;
};

export type ApiSignature = {
  text: string;
  parameters: ApiParameter[];
  returns?: string;
  effect?: boolean;
};

export type ApiMember = {
  name: string;
  kind: string;
  description: string;
  source: ApiSource;
  signatures: ApiSignature[];
  type?: string;
  default?: string;
  defaultFactory?: string;
  optional?: boolean;
  constructorParameter?: boolean;
  readonly?: boolean;
  inheritedFrom?: string;
  deprecated?: string;
};

export type ApiSymbol = ApiMember & {
  id: string;
  module: string;
  imports: string[];
  members: ApiMember[];
  bases: string[];
  examples: string[];
  bindings: Record<string, string>;
};

export type ApiReference = {
  language: "typescript" | "python";
  symbols: ApiSymbol[];
};

export const apiSlug = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase();
