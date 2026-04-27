// MarkdownContent.tsx
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
  <div
    className={`
      prose prose-sm dark:prose-invert max-w-none break-words
      prose-headings:font-serif prose-headings:font-bold
      prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-3
      prose-h2:text-xl prose-h2:mt-5 prose-h2:mb-2
      prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
      prose-p:my-2 prose-p:leading-relaxed
      prose-hr:my-5 prose-hr:border-border
      prose-ul:list-disc prose-ul:pl-5 prose-ul:my-2
      prose-ol:list-decimal prose-ol:pl-5 prose-ol:my-2
      prose-li:my-1
      prose-strong:font-bold
      prose-em:italic
      prose-blockquote:border-l-4 prose-blockquote:border-primary/40
      prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
      prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-pre:bg-muted prose-pre:rounded prose-pre:p-3 prose-pre:overflow-x-auto
      prose-a:text-primary prose-a:underline
      ${className}
    `}
  >
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" />
        ),
        p: ({ children, ...props }) => (
          <p {...props}>
            {Array.isArray(children)
              ? children.map((child, i) =>
                  typeof child === "string" ? (
                    <span key={i}>{highlightMentions(child)}</span>
                  ) : (
                    child
                  )
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
