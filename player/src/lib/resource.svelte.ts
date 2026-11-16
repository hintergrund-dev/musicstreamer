export class Resource<T> {
  loading = $state(true);
  error = $state('');
  data = $state.raw<T>();
  private n = 0;

  /** Runs `fn`; a newer run discards the result of an older one (route changes). */
  async run(fn: () => Promise<T>) {
    const n = ++this.n;
    this.loading = true;
    this.error = '';
    try {
      const d = await fn();
      if (n === this.n) this.data = d;
    } catch (e) {
      if (n === this.n) this.error = e instanceof TypeError ? 'Network' : ((e as { error?: string }).error ?? 'generic');
    } finally {
      if (n === this.n) this.loading = false;
    }
  }
}
