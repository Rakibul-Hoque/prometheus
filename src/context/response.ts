import { getMimeType } from "../mime";
import type { Response } from "./types";

export const responsePrototype: Partial<Response> = {
  get status(): number {
    return (this as Response)._statusCode?? 200;
  },
  set status(code: number) {
    (this as Response)._statusCode = code;
  },

  get body(): any {
    return (this as Response)._body;
  },
  set body(v: any) {
    (this as Response)._body = v;
  },

  get type(): string | undefined {
    const self = this as Response;
    return self.headers?.get("content-type") as string | undefined;
  },
  set type(value: string) {
    const self = this as Response;
    const mime = getMimeType(value) || value;
    self.headers.set("content-type", mime);
  },

  get(name: string): string | string[] | undefined {
    return (this as Response).headers.get(name.toLowerCase());
  },

  set(nameOrHeaders: any, value?: string): void {
    const self = this as Response;
    if (typeof nameOrHeaders === "object") {
      for (const [k, v] of Object.entries(nameOrHeaders)) {
        self.headers.set(k.toLowerCase(), v as string);
      }
    } else if (value!== undefined) {
      self.headers.set(nameOrHeaders.toLowerCase(), value);
    }
  },

  append(name: string, value: string): void {
    const self = this as Response;
    const key = name.toLowerCase();
    const prev = self.headers.get(key);
    if (!prev) self.headers.set(key, value);
    else if (Array.isArray(prev)) self.headers.set(key, [...prev, value]);
    else self.headers.set(key, [prev as string, value]);
  },

  remove(name: string): void {
    (this as Response).headers.delete(name.toLowerCase());
  },
};