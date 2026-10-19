declare module "potrace" {
  type Options = Record<string, unknown>;
  const potrace: {
    trace(input: Buffer | string, options: Options, callback: (error: Error | null, svg: string) => void): void;
  };
  export default potrace;
}
