import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

interface Props {
  text: string;
  className?: string;
}

export default function Linkify({ text, className }: Props) {
  const parts = text.split(URL_REGEX);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}
