type Writer = (chunk: string) => void;

export class LiveHub {
  private writers = new Set<Writer>();

  get size() {
    return this.writers.size;
  }

  subscribe(writer: Writer): () => void {
    this.writers.add(writer);
    return () => this.writers.delete(writer);
  }

  broadcast(event: unknown) {
    const frame = `data: ${JSON.stringify(event)}\n\n`;
    for (const writer of this.writers) {
      try {
        writer(frame);
      } catch {
        this.writers.delete(writer);
      }
    }
  }
}
