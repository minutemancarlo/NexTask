import React from 'react';
import { ExternalLink, Check, Copy, Terminal } from 'lucide-react';
import { CODE_LANGUAGES } from '../../utils/codeLanguages';

export const MarkdownRenderer = ({ content, onTagClick, onToggleChecklist, noteId }) => {
  if (!content) return null;

  // Render inline formatting: bold, italic, strike, code, link, and #hashtags
  const renderInline = (text) => {
    if (!text) return null;

    // Tokenize text into special inline tokens
    // Patterns:
    // 1. Markdown Links: [label](url)
    // 2. Hashtags: #([a-zA-Z0-9_\u4e00-\u9fa5\u0080-\uffff/-]+)
    // 3. Inline code: `code`
    // 4. Bold: **text**
    // 5. Italic: *text* or _text_
    // 6. Strikethrough: ~~text~~
    const regex = /(\[[^\]]+\]\([^)]+\)|(?:^|\s)#[a-zA-Z0-9_\u4e00-\u9fa5\u0080-\uffff/-]+|`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*)/g;

    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const raw = match[0];

      // Markdown Link
      if (raw.startsWith('[') && raw.includes('](')) {
        const linkMatch = raw.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          parts.push(
            <a
              key={match.index}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium break-all"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{linkMatch[1]}</span>
              <ExternalLink className="w-3 h-3 opacity-70 inline" />
            </a>
          );
        } else {
          parts.push(raw);
        }
      }
      // Inline Hashtag
      else if (raw.includes('#')) {
        const leadingSpace = raw.startsWith(' ') ? ' ' : '';
        const tagText = raw.trim();
        const tagClean = tagText.replace(/^#/, '').replace(/[.,!?;:]$/, '');
        const trailingPunct = tagText.slice(tagClean.length + 1);

        parts.push(
          <React.Fragment key={match.index}>
            {leadingSpace}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onTagClick) onTagClick(tagClean.toLowerCase());
              }}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/60 dark:border-indigo-800/50 transition-colors cursor-pointer"
              title={`Filter notes with #${tagClean}`}
            >
              #{tagClean}
            </button>
            {trailingPunct}
          </React.Fragment>
        );
      }
      // Inline Code
      else if (raw.startsWith('`') && raw.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-mono text-xs font-medium border border-slate-200 dark:border-slate-700"
          >
            {raw.slice(1, -1)}
          </code>
        );
      }
      // Bold
      else if (raw.startsWith('**') && raw.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
            {raw.slice(2, -2)}
          </strong>
        );
      }
      // Strikethrough
      else if (raw.startsWith('~~') && raw.endsWith('~~')) {
        parts.push(
          <del key={match.index} className="line-through text-slate-400 dark:text-slate-500">
            {raw.slice(2, -2)}
          </del>
        );
      }
      // Italic
      else if (raw.startsWith('*') && raw.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic">
            {raw.slice(1, -1)}
          </em>
        );
      } else {
        parts.push(raw);
      }

      lastIndex = match.index + raw.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // Split lines and parse blocks (code blocks, checklists, lists, blockquotes, headers, paragraphs)
  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockLines = [];
  let codeBlockLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block Check
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        const codeText = codeBlockLines.join('\n');
        elements.push(
          <CodeBlock key={`code-${i}`} code={codeText} lang={codeBlockLang} />
        );
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Checkbox checklist items: - [ ] or - [x]
    const checkMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      const isChecked = checkMatch[2].toLowerCase() === 'x';
      const itemText = checkMatch[3];
      elements.push(
        <div
          key={`check-${i}`}
          className="flex items-start gap-2.5 my-1.5 group select-none"
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              if (onToggleChecklist && noteId) {
                onToggleChecklist(noteId, itemText, !isChecked);
              }
            }}
            className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer transition-colors"
          />
          <span
            className={`text-sm leading-relaxed transition-all ${
              isChecked
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {renderInline(itemText)}
          </span>
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold text-slate-900 dark:text-white mt-3 mb-1.5">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-slate-900 dark:text-white mt-2.5 mb-1">
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-900 dark:text-white mt-2 mb-1">
          {renderInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-indigo-400 dark:border-indigo-600 pl-3 py-1 my-2 italic text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-r-md text-sm"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Unordered list item: - item or * item
    if (line.match(/^(\s*)[-*]\s+(.*)$/)) {
      const listMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
      elements.push(
        <div key={`list-${i}`} className="flex items-start gap-2 my-1 text-sm text-slate-800 dark:text-slate-200">
          <span className="text-indigo-500 font-bold mt-0.5">•</span>
          <span>{renderInline(listMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Ordered list: 1. item
    if (line.match(/^(\s*)(\d+)\.\s+(.*)$/)) {
      const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      elements.push(
        <div key={`numlist-${i}`} className="flex items-start gap-2 my-1 text-sm text-slate-800 dark:text-slate-200">
          <span className="text-indigo-500 font-semibold text-xs mt-0.5 min-w-[1.2rem]">{numMatch[2]}.</span>
          <span>{renderInline(numMatch[3])}</span>
        </div>
      );
      continue;
    }

    // Empty line / paragraph break
    if (!line.trim()) {
      elements.push(<div key={`blank-${i}`} className="h-2" />);
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 my-0.5">
        {renderInline(line)}
      </p>
    );
  }

  return <div className="space-y-0.5 break-words">{elements}</div>;
};

// Subcomponent for Code Block with copy action and language metadata
const CodeBlock = ({ code, lang }) => {
  const [copied, setCopied] = React.useState(false);

  const langMeta = React.useMemo(() => {
    if (!lang) return null;
    const clean = lang.toLowerCase().trim();
    return CODE_LANGUAGES.find(l => l.tag === clean || l.id === clean);
  }, [lang]);

  const lineCount = React.useMemo(() => {
    if (!code) return 1;
    return code.split('\n').length;
  }, [code]);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLabel = langMeta ? langMeta.label : (lang ? lang.toUpperCase() : 'TEXT');

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900 text-slate-100 font-mono text-xs shadow-inner">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 border-b border-slate-700/60 text-slate-400 text-[11px]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-200">{displayLabel}</span>
          {langMeta && langMeta.tag !== langMeta.label.toLowerCase() && (
            <span className="text-[10px] text-slate-400 font-mono">
              ({langMeta.tag})
            </span>
          )}
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-[10px]">{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
        </div>

        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-700/60"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};
