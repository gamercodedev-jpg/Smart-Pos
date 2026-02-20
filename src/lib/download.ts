export function downloadTextFile(params: { filename: string; content: string; mimeType: string }) {
  const blob = new Blob([params.content], { type: params.mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = params.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
