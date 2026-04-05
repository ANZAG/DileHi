import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent = ({ content, className = "" }: MarkdownContentProps) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    className={`prose prose-sm dark:prose-invert max-w-none break-words ${className}`}
    components={{
      a: ({ ...props }) => (
        <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary underline" />
      ),
      pre: ({ ...props }) => (
        <pre {...props} className="bg-muted rounded p-2 overflow-x-auto text-xs" />
      ),
      code: ({ className, children, ...props }) => {
        const isInline = !className;
        return isInline ? (
          <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props}>{children}</code>
        ) : (
          <code className={className} {...props}>{children}</code>
        );
      },
    }}
  >
    {content}
  </ReactMarkdown>
);

export default MarkdownContent;
