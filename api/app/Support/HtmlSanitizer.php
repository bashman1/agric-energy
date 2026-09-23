<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;

/**
 * Allow-list sanitiser for the rich-text content fields.
 *
 * The job summary, duties and competences fields are authored in CKEditor and
 * therefore arrive as HTML. Storing that verbatim would make any renderer
 * that forgets to escape — the PDF export, a notification email, a future
 * template — a stored-XSS sink, and partners can reach these fields through
 * the submission form, so the author is not always staff.
 *
 * This rebuilds the document from an allow-list rather than blacklisting bad
 * input: an element not named below cannot survive, whatever it is called and
 * however it is encoded. The UI sanitises again on render (lib/html/sanitize.ts);
 * this is the gate that decides what is ever written down.
 *
 * The allow-list matches the toolbar in RichTextEditorClient.tsx. Widen both
 * together, or the editor will offer formatting that is silently discarded.
 */
final class HtmlSanitizer
{
    /** Elements kept, with their permitted attributes. */
    private const ALLOWED = [
        'p' => [],
        'br' => [],
        'strong' => [],
        'b' => [],
        'em' => [],
        'i' => [],
        'u' => [],
        's' => [],
        'ul' => [],
        'ol' => [],
        'li' => [],
        'h3' => [],
        'h4' => [],
        'blockquote' => [],
        'a' => ['href', 'target', 'rel'],
    ];

    /** Dropped with their contents; everything else unnamed is unwrapped. */
    private const STRIP_WITH_CONTENT = [
        'script', 'style', 'iframe', 'object', 'embed', 'noscript',
        'template', 'form', 'input', 'button', 'svg', 'math',
    ];

    /** Schemes a link may use. */
    private const URL_PATTERN = '/^(?:https?:\/\/|mailto:|tel:|#|\/)/i';

    /**
     * Clean a rich-text value. Returns '' for empty input and null for null,
     * so a field left untouched stays untouched.
     */
    public static function clean(?string $html): ?string
    {
        if ($html === null) {
            return null;
        }

        if (trim($html) === '') {
            return '';
        }

        $doc = new DOMDocument('1.0', 'UTF-8');

        // Parse as a fragment: no doctype, no implied <html>/<body> in the
        // output. The meta charset is what makes libxml read UTF-8 correctly.
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML(
            '<?xml encoding="UTF-8"?><div id="ae-root">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $doc->getElementById('ae-root');
        if (! $root) {
            return '';
        }

        self::cleanChildren($root);

        $out = '';
        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    /** True when the value has no text a reader would see. */
    public static function isBlank(?string $html): bool
    {
        if ($html === null) {
            return true;
        }

        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // \xC2\xA0 is a UTF-8 non-breaking space, which trim() leaves alone.
        return trim(str_replace("\xC2\xA0", ' ', $text)) === '';
    }

    /** Recursively filter a node's children in place. */
    private static function cleanChildren(DOMNode $node): void
    {
        // Snapshot first: the loop reparents and removes nodes, and a live
        // DOMNodeList would skip siblings as the collection shifts underneath.
        $children = iterator_to_array($node->childNodes);

        foreach ($children as $child) {
            if ($child instanceof DOMElement) {
                self::cleanElement($child);
            } elseif (! ($child->nodeType === XML_TEXT_NODE)) {
                // Comments, CDATA, processing instructions.
                $child->parentNode?->removeChild($child);
            }
        }
    }

    private static function cleanElement(DOMElement $el): void
    {
        $tag = strtolower($el->nodeName);

        if (in_array($tag, self::STRIP_WITH_CONTENT, true)) {
            $el->parentNode?->removeChild($el);

            return;
        }

        // Clean the subtree before deciding what to do with this element, so
        // an unwrapped node hands up children that are already safe.
        self::cleanChildren($el);

        if (! array_key_exists($tag, self::ALLOWED)) {
            self::unwrap($el);

            return;
        }

        $allowedAttrs = self::ALLOWED[$tag];

        foreach (iterator_to_array($el->attributes ?? []) as $attr) {
            if (! in_array(strtolower($attr->nodeName), $allowedAttrs, true)) {
                $el->removeAttribute($attr->nodeName);
            }
        }

        if ($tag === 'a') {
            $href = $el->getAttribute('href');

            if ($href === '' || ! preg_match(self::URL_PATTERN, trim($href))) {
                // A link we cannot vouch for keeps its text, loses its target.
                self::unwrap($el);

                return;
            }

            if ($el->getAttribute('target') === '_blank') {
                $el->setAttribute('rel', 'noopener noreferrer');
            } else {
                $el->removeAttribute('target');
                $el->removeAttribute('rel');
            }
        }
    }

    /** Replace an element with its children, keeping the text. */
    private static function unwrap(DOMElement $el): void
    {
        $parent = $el->parentNode;
        if (! $parent) {
            return;
        }

        while ($el->firstChild) {
            $parent->insertBefore($el->firstChild, $el);
        }

        $parent->removeChild($el);
    }
}
