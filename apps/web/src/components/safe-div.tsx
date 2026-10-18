import DOMPurify from "dompurify";

export function SafeDiv({
  html,
  ...props
}: React.HTMLProps<HTMLDivElement> & { html: string }) {
  if (typeof window === "undefined") {
    return <div {...props} />;
  }

  const clean = DOMPurify?.sanitize(html);

  return (
    <div
      {...props}
      dangerouslySetInnerHTML={{
        __html: clean,
      }}
    />
  );
}
