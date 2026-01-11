export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export type Stream = {
  name: string;
  title: string;
  url: string;
};

export type StreamResponse = {
  streams: Stream[];
};
