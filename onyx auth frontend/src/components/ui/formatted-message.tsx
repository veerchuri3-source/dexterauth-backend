import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { md } from '@/lib/markdown';
import './formatted-message.css';

interface FormattedMessageProps {
    content: string;
    className?: string;
    onLinkClick?: (url: string) => void;
}

export function FormattedMessage({ content, className = "", onLinkClick }: FormattedMessageProps) {
    const html = useMemo(() => {
        if (!content) return "";

        // Render markdown to HTML
        const rawHtml = md.render(content);

        // Sanitize HTML
        // Allow specific tags and attributes for our custom renderers
        return DOMPurify.sanitize(rawHtml, {
            ADD_TAGS: ['span', 's', 'u', 'pre', 'code', 'div', 'button'],
            ADD_ATTR: ['target', 'onclick', 'class', 'title'],
        });
    }, [content]);

    const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;

        // Handle Copy Button Click
        if (target.closest('.copy-btn')) {
            e.preventDefault();
            const btn = target.closest('.copy-btn') as HTMLButtonElement;
            const wrapper = btn.closest('.code-block-wrapper');

            if (wrapper) {
                const codeElement = wrapper.querySelector('pre code');
                if (codeElement && codeElement.textContent) {
                    try {
                        await navigator.clipboard.writeText(codeElement.textContent);

                        // Visual Feedback
                        const originalText = btn.innerText;
                        btn.innerText = 'Copied!';
                        btn.classList.add('text-green-400'); // Optional Tailwind class if available, or just rely on text

                        setTimeout(() => {
                            btn.innerText = originalText;
                            btn.classList.remove('text-green-400');
                        }, 2000);
                    } catch (err) {
                        console.error('Failed to copy code:', err);
                        btn.innerText = 'Error';
                        setTimeout(() => btn.innerText = 'Copy', 2000);
                    }
                }
            }
            return;
        }

        // Handle links if handler provided
        if (onLinkClick) {
            const link = target.tagName === 'A' ? target : target.closest('a');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href) onLinkClick(href);
            }
        }
    };

    return (
        <div
            className={`markdown-content ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
            onClick={handleClick}
        />
    );
}
