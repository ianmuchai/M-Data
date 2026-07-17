declare module 'cors' {
  import type { RequestHandler } from 'express';

  type CorsOptions = {
    origin?:
      | string
      | string[]
      | boolean
      | ((origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void);
  };

  export default function cors(options?: CorsOptions): RequestHandler;
}
