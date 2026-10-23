import { serializeJsonLd } from "@/lib/json-ld";

/** Structured data for search engines, rendered in the page as the Next.js docs recommend. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: serialized with `<` escaped
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
