import MarkdownIt from 'markdown-it';

// Initialize markdown-it with specific configuration
export const md = new MarkdownIt({
    html: false,        // Disable HTML tags for security
    breaks: true,       // Convert \n to <br>
    linkify: true,      // Autolink URLs
    typographer: true   // Smart quotes
});

// Helper for simple paired markers
function addSimpleRule(name: string, marker: string, tag: string, className?: string) {
    md.inline.ruler.push(name, (state, silent) => {
        const pos = state.pos;
        const max = state.posMax;
        const len = marker.length;

        if (state.src.slice(pos, pos + len) !== marker) return false;

        let start = pos + len;
        let end = -1;

        for (let i = start; i < max - (len - 1); i++) {
            if (state.src.slice(i, i + len) === marker) {
                end = i;
                break;
            }
        }

        if (end === -1) return false;

        if (!silent) {
            const tokenOpen = state.push(`${name}_open`, tag, 1);
            if (className) tokenOpen.attrs = [['class', className]];

            const content = state.src.slice(start, end);
            const tokenText = state.push('text', '', 0);
            tokenText.content = content;

            state.push(`${name}_close`, tag, -1);
        }

        state.pos = end + len;
        return true;
    });
}

// ||spoiler||
addSimpleRule('spoiler', '||', 'span', 'spoiler');
md.renderer.rules.spoiler_open = () => '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">';
md.renderer.rules.spoiler_close = () => '</span>';

// ~~strikethrough~~
addSimpleRule('strikethrough', '~~', 's');

// Override __bold__ to be <u>underline</u>
md.renderer.rules.strong_open = (tokens, idx, options, env, self) => {
    if (tokens[idx].markup === '__') return '<u>';
    return '<strong>';
};
md.renderer.rules.strong_close = (tokens, idx, options, env, self) => {
    if (tokens[idx].markup === '__') return '</u>';
    return '</strong>';
};

// Customize Link Rendering to open in new tab
const defaultLinkRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
};

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const t = tokens[idx];
    const aIndex = t.attrIndex('target');
    if (aIndex < 0) {
        t.attrPush(['target', '_blank']);
    } else {
        t.attrs![aIndex][1] = '_blank';
    }

    const relIndex = t.attrIndex('rel');
    if (relIndex < 0) {
        t.attrPush(['rel', 'noopener noreferrer']);
    } else {
        t.attrs![relIndex][1] = 'noopener noreferrer';
    }

    return defaultLinkRender(tokens, idx, options, env, self);
};

// Custom Fence Renderer for Code Blocks with Copy Button
md.renderer.rules.fence = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
    let languageName = '';

    if (info) {
        languageName = info.split(/\s+/)[0];
    }

    // Render code content safely
    const content = md.utils.escapeHtml(token.content);

    // Construct HTML structure
    return '<div class="code-block-wrapper">' +
        '  <div class="code-block-header">' +
        '    <span class="language-label">' + (languageName || 'text') + '</span>' +
        '    <button class="copy-btn" title="Copy code">Copy</button>' +
        '  </div>' +
        '  <pre><code>' + content + '</code></pre>' +
        '</div>';
};
