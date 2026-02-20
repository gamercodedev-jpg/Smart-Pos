export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function digitsOnly(input: string) {
  return input.replace(/[^0-9]/g, '');
}

export function buildWhatsAppUrlTo(phone: string, message: string) {
  const digits = digitsOnly(phone);
  if (!digits) return buildWhatsAppUrl(message);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(params: { subject: string; body: string; to?: string }) {
  const to = params.to ? encodeURIComponent(params.to) : '';
  const subject = encodeURIComponent(params.subject);
  const body = encodeURIComponent(params.body);
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function openExternal(url: string) {
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // ignore
  }
}
