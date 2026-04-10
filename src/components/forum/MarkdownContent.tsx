import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Highlight @mentions in text nodes
const highlightMentions = (text: string): (string | React.ReactElement)[] => {
  const parts = text.split(/(@[\wÀ-ÿ][\wÀ-ÿ .\\-]*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span key={i} className="bg-primary/10 text-primary rounded px-0.5 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
};

const MarkdownContent = ({ content, className = "" }: MarkdownContentProps) => (
  <div className={`prose prose-sm dark:prose-invert max-w-none break-words ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline" />
        ),
        pre: ({ ...props }) => (
          <pre {...props} className="bg-muted rounded p-2 overflow-x-auto text-xs" />
        ),
        code: ({ className: codeClassName, children, ...props }) => {
          const isInline = !codeClassName;
          return isInline ? (
            <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>{children}</code>
          ) : (
            <code className={codeClassName} {...props}>{children}</code>
          );
        },
        p: ({ children, ...props }) => (
          <p {...props}>
            {Array.isArray(children)
              ? children.map((child, i) =>
                  typeof child === "string" ? <span key={i}>{highlightMentions(child)}</span> : child
                )
              : typeof children === "string"
                ? highlightMentions(children)
                : children}
          </p>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);

export default MarkdownContent;
