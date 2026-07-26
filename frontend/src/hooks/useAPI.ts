export const api = {
  GET: (url: string) => fetch(url).then((r) => r.json()),
  POST: (url: string, body: unknown) =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
}
