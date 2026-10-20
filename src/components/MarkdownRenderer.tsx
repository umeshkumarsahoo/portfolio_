import React, { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

export interface MarkdownRendererProps {
  content: string;
  role?: "user" | "agent";
  className?: string;
}

interface InlineNode {
  type: "text" | "bold" | "italic" | "bold-italic" | "code" | "link";
  value?: string;
  title?: string;
  url?: string;
}

interface SingleBlock {
  type: "paragraph" | "heading" | "quote" | "bullet-item" | "tree-item" | "numbered-item" | "code-block" | "divider" | "spacer";
  text?: string;
  level?: number;
  number?: string;
  indented?: boolean;
  lang?: string;
  code?: string;
}

interface GroupedBlock {
  type: "paragraph" | "heading" | "quote" | "bullet-list" | "numbered-list" | "code-block" | "divider" | "spacer";
  text?: string;
  level?: number;
  lang?: string;
  code?: string;
  items?: SingleBlock[];
}

/**
 * Tokenizes an inline markdown string into parsed nodes.
 * Accurately parses bold (**text**), italics (*text*, *"text"*), bold-italics,
 * code (`code`), markdown links ([title](url)), and raw URLs.
 */
function parseInline(text: string): InlineNode[] {
  if (!text) return [];

  // Patterns in priority:
  // 1: `code`
  // 2: [title](url)
  // 5: raw url (https?://...)
  // 6: ***bold-italic***
  // 8: **bold**
  // 10: __bold__
  // 12: *"quoted italic"*
  // 14: "*quoted italic*"
  // 16: *italic*
  // 18: _italic_
  const regex = /(`[^`]+`)|(\[([^\n\]]*?)\]\(((?:https?:\/\/|mailto:|\/|#)[^\s)]+)\))|(https?:\/\/[^\s<>()]+)|(\*\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*\*)|(\*\*(?!\s)([^*\n]+?)(?<!\s)\*\*)|(__(?!\s)([^_\n]+?)(?<!\s)__)|(\*\"([^\"]+?)\"\*)|(\"\*([^*]+?)\"\*)|((?<!\*)\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\*))|((?<!_)_(?!\s)([^_\n]+?)(?<!\s)_(?!_))/g;

  let lastIndex = 0;
  const nodes: InlineNode[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: text.substring(lastIndex, match.index) });
    }

    if (match[1]) {
      // Inline code
      nodes.push({ type: "code", value: match[1].slice(1, -1) });
    } else if (match[2]) {
      // [title](url)
      nodes.push({ type: "link", title: match[3], url: match[4] });
    } else if (match[5]) {
      // auto url
      nodes.push({ type: "link", title: match[5], url: match[5] });
    } else if (match[6]) {
      // ***bold italic***
      nodes.push({ type: "bold-italic", value: match[7] });
    } else if (match[8]) {
      // **bold**
      nodes.push({ type: "bold", value: match[9] });
    } else if (match[10]) {
      // __bold__
      nodes.push({ type: "bold", value: match[11] });
    } else if (match[12]) {
      // *"quoted italic"*
      nodes.push({ type: "italic", value: `"${match[13]}"` });
    } else if (match[14]) {
      // "*quoted italic*"
      nodes.push({ type: "italic", value: `"${match[15]}"` });
    } else if (match[16]) {
      // *italic*
      nodes.push({ type: "italic", value: match[17] });
    } else if (match[18]) {
      // _italic_
      nodes.push({ type: "italic", value: match[19] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: "text", value: text.substring(lastIndex) });
  }

  return nodes;
}

/**
 * Recursively renders inline nodes into React elements.
 */
function renderInlineContent(text: string, role: "user" | "agent"): React.ReactNode[] {
  const nodes = parseInline(text);

  return nodes.map((node, idx) => {
    const key = `inline-${idx}`;

    switch (node.type) {
      case "bold":
        return (
          <strong
            key={key}
            className={
              role === "user"
                ? "font-bold text-inherit"
                : "font-semibold text-[var(--text-primary)]"
            }
          >
            {node.value ? renderInlineContent(node.value, role) : null}
          </strong>
        );

      case "italic":
        return (
          <em
            key={key}
            className={
              role === "user"
                ? "italic text-inherit"
                : "italic text-[var(--text-primary)]"
            }
          >
            {node.value ? renderInlineContent(node.value, role) : null}
          </em>
        );

      case "bold-italic":
        return (
          <strong
            key={key}
            className={
              role === "user"
                ? "font-bold italic text-inherit"
                : "font-semibold italic text-[var(--text-primary)]"
            }
          >
            {node.value ? renderInlineContent(node.value, role) : null}
          </strong>
        );

      case "code":
        return (
          <code
            key={key}
            className={
              role === "user"
                ? "px-1.5 py-0.5 rounded font-mono text-xs bg-white/20 border border-white/20 text-inherit"
                : "px-1.5 py-0.5 rounded font-mono text-xs bg-[var(--bg-secondary)] border border-[var(--color-border)] text-[var(--accent-blue)]"
            }
          >
            {node.value}
          </code>
        );

      case "link":
        const isExternal = Boolean(node.url && (node.url.startsWith("http") || node.url.startsWith("//")));
        return (
          <a
            key={key}
            href={node.url}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className={
              role === "user"
                ? "underline underline-offset-2 hover:opacity-80 inline-flex items-baseline gap-0.5 text-inherit"
                : "text-[var(--accent-blue)] underline underline-offset-2 hover:opacity-85 inline-flex items-baseline gap-0.5 font-medium transition-opacity"
            }
          >
            <span>{node.title || node.url}</span>
            {isExternal && <ExternalLink className="w-2.5 h-2.5 inline-block opacity-60 ml-0.5 shrink-0 self-center" />}
          </a>
        );

      case "text":
      default:
        return <React.Fragment key={key}>{node.value}</React.Fragment>;
    }
  });
}

/**
 * Interactive CodeBlock component with copy-to-clipboard functionality.
 */
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-2.5 rounded border border-[var(--color-border)] bg-[var(--bg-secondary)] overflow-hidden text-xs shadow-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-border)]/25 border-b border-[var(--color-border)] text-[11px] font-mono text-[var(--text-faint)] select-none">
        <span className="uppercase tracking-wider">{lang || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-[var(--text-primary)] leading-relaxed select-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Splits raw content into structured blocks.
 */
function parseBlocks(rawText: string): SingleBlock[] {
  const lines = rawText.split(/\r?\n/);
  const blocks: SingleBlock[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code fence
    const codeFenceMatch = line.match(/^```(\w*)/);
    if (codeFenceMatch) {
      if (inCodeBlock) {
        blocks.push({
          type: "code-block",
          lang: codeBlockLang,
          code: codeBlockLines.join("\n"),
        });
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockLines = [];
      } else {
        inCodeBlock = true;
        codeBlockLang = codeFenceMatch[1] || "";
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Horizontal rule: ---, ***, ___
    if (/^(---|___|\*\*\*)\s*$/.test(line)) {
      blocks.push({ type: "divider" });
      continue;
    }

    // Heading: #, ##, ###, ####
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    // Blockquote: > text
    const quoteMatch = line.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      blocks.push({
        type: "quote",
        text: quoteMatch[1],
      });
      continue;
    }

    // Numbered list item: 1. or 01. or 1)
    const numberedMatch = line.match(/^(\d{1,2})[\.\)]\s+(.+)$/);
    if (numberedMatch) {
      blocks.push({
        type: "numbered-item",
        number: numberedMatch[1],
        text: numberedMatch[2],
      });
      continue;
    }

    // Sub-item tree arrow: ↳ or ->
    const treeMatch = line.match(/^(\s*)(↳|->)\s+(.+)$/);
    if (treeMatch) {
      blocks.push({
        type: "tree-item",
        text: treeMatch[3],
      });
      continue;
    }

    // Bullet list item: •, -, *, + (including indented)
    const bulletMatch = line.match(/^(\s*)([•\-\*\+])\s+(.+)$/);
    if (bulletMatch) {
      const isIndented = bulletMatch[1].length >= 2;
      blocks.push({
        type: "bullet-item",
        indented: isIndented,
        text: bulletMatch[3],
      });
      continue;
    }

    // Blank line
    if (!line.trim()) {
      blocks.push({ type: "spacer" });
      continue;
    }

    // Regular paragraph / text line
    blocks.push({
      type: "paragraph",
      text: line,
    });
  }

  // Handle unclosed code block if response was truncated
  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push({
      type: "code-block",
      lang: codeBlockLang,
      code: codeBlockLines.join("\n"),
    });
  }

  return blocks;
}

/**
 * Groups consecutive list items for semantic rendering.
 */
function groupBlocks(blocks: SingleBlock[]): GroupedBlock[] {
  const grouped: GroupedBlock[] = [];
  let currentBulletList: SingleBlock[] | null = null;
  let currentNumberedList: SingleBlock[] | null = null;

  const flushLists = () => {
    if (currentBulletList && currentBulletList.length > 0) {
      grouped.push({ type: "bullet-list", items: currentBulletList });
      currentBulletList = null;
    }
    if (currentNumberedList && currentNumberedList.length > 0) {
      grouped.push({ type: "numbered-list", items: currentNumberedList });
      currentNumberedList = null;
    }
  };

  for (const block of blocks) {
    if (block.type === "bullet-item" || block.type === "tree-item") {
      if (currentNumberedList) {
        grouped.push({ type: "numbered-list", items: currentNumberedList });
        currentNumberedList = null;
      }
      if (!currentBulletList) currentBulletList = [];
      currentBulletList.push(block);
    } else if (block.type === "numbered-item") {
      if (currentBulletList) {
        grouped.push({ type: "bullet-list", items: currentBulletList });
        currentBulletList = null;
      }
      if (!currentNumberedList) currentNumberedList = [];
      currentNumberedList.push(block);
    } else {
      flushLists();
      grouped.push(block as GroupedBlock);
    }
  }

  flushLists();
  return grouped;
}

/**
 * MarkdownRenderer Component:
 * Clean, XSS-safe, native React markdown parser that replaces raw markdown
 * characters like `**bold**`, `*italic*`, `[links](url)`, and headers with
 * properly formatted, responsive elements styled for the editorial portfolio.
 */
export default function MarkdownRenderer({ content, role = "agent", className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  const singleBlocks = parseBlocks(content);
  const groupedBlocks = groupBlocks(singleBlocks);

  return (
    <div className={`markdown-body space-y-2.5 ${className}`}>
      {groupedBlocks.map((block, idx) => {
        const key = `block-${idx}`;

        switch (block.type) {
          case "spacer":
            return <div key={key} className="h-1.5" />;

          case "divider":
            return (
              <hr
                key={key}
                className={
                  role === "user"
                    ? "border-t border-white/20 my-2"
                    : "border-t border-[var(--color-border)] my-2"
                }
              />
            );

          case "heading": {
            const level = block.level || 2;
            const headingContent = block.text ? renderInlineContent(block.text, role) : null;
            if (level === 1 || level === 2) {
              return (
                <h3
                  key={key}
                  className="font-bold text-sm tracking-tight text-[var(--text-primary)] mt-3 mb-1 first:mt-0"
                >
                  {headingContent}
                </h3>
              );
            }
            if (level === 3) {
              return (
                <h4
                  key={key}
                  className="font-semibold text-xs tracking-wider uppercase text-[var(--text-primary)] mt-2 mb-1 first:mt-0"
                >
                  {headingContent}
                </h4>
              );
            }
            return (
              <h5
                key={key}
                className="font-mono text-xs font-semibold text-[var(--text-faint)] mt-2 mb-0.5 first:mt-0"
              >
                {headingContent}
              </h5>
            );
          }

          case "quote":
            return (
              <blockquote
                key={key}
                className={
                  role === "user"
                    ? "border-l-2 border-white/40 pl-3 italic opacity-90 my-1.5"
                    : "border-l-2 border-[var(--accent-blue)] pl-3 italic text-[var(--text-secondary)] my-1.5"
                }
              >
                {block.text ? renderInlineContent(block.text, role) : null}
              </blockquote>
            );

          case "bullet-list":
            return (
              <ul key={key} className="space-y-1.5 my-1">
                {block.items?.map((item, itemIdx) => {
                  const itemKey = `${key}-item-${itemIdx}`;
                  if (item.type === "tree-item") {
                    return (
                      <li key={itemKey} className="flex items-start gap-2 pl-4 text-xs text-[var(--text-secondary)]">
                        <span className="font-mono text-[var(--accent-blue)] select-none shrink-0 mt-0.5">↳</span>
                        <div className="flex-1 leading-relaxed">
                          {item.text ? renderInlineContent(item.text, role) : null}
                        </div>
                      </li>
                    );
                  }
                  return (
                    <li
                      key={itemKey}
                      className={`flex items-start gap-2 ${item.indented ? "pl-4 text-xs opacity-90" : ""}`}
                    >
                      <span
                        className={
                          role === "user"
                            ? "w-1.5 h-1.5 rounded-full bg-current mt-2 shrink-0 select-none"
                            : "w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] mt-2 shrink-0 select-none"
                        }
                      />
                      <div className="flex-1 leading-relaxed">
                        {item.text ? renderInlineContent(item.text, role) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            );

          case "numbered-list":
            return (
              <ol key={key} className="space-y-1.5 my-1">
                {block.items?.map((item, itemIdx) => {
                  const itemKey = `${key}-num-${itemIdx}`;
                  return (
                    <li key={itemKey} className="flex items-start gap-2.5">
                      <span
                        className={
                          role === "user"
                            ? "font-mono text-xs font-semibold shrink-0 select-none mt-0.5 text-inherit"
                            : "font-mono text-xs font-semibold text-[var(--accent-blue)] shrink-0 select-none mt-0.5"
                        }
                      >
                        {item.number ? `${item.number}.` : `${itemIdx + 1}.`}
                      </span>
                      <div className="flex-1 leading-relaxed">
                        {item.text ? renderInlineContent(item.text, role) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            );

          case "code-block":
            return (
              <div key={key}>
                <CodeBlock
                  code={block.code || ""}
                  lang={block.lang}
                />
              </div>
            );

          case "paragraph":
          default:
            return (
              <p key={key} className="leading-relaxed">
                {block.text ? renderInlineContent(block.text, role) : null}
              </p>
            );
        }
      })}
    </div>
  );
}
