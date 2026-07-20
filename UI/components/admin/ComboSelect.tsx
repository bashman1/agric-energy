"use client";

import { useState, useRef, useEffect, useId } from "react";

export interface ComboOption {
    id: string;      // the value stored (slug for partners/techs/themes, or free text)
    label: string;   // display name
}

interface ComboSelectProps {
    options: ComboOption[];
    value: string[];                  // array of selected ids
    onChange: (ids: string[]) => void;
    multi?: boolean;
    placeholder?: string;
    allowCreate?: boolean;             // allow adding an id not in the list
    createLabel?: string;             // label shown for "create" action, e.g. "Add new technology"
    onCreateNew?: (query: string) => void; // if set, instead of adding free-text, triggers this callback
    disabled?: boolean;
    className?: string;
    inputId?: string;                 // id for the text input, so an external <label htmlFor> can target it
}

export default function ComboSelect({
    options,
    value,
    onChange,
    multi = false,
    placeholder = "Search or select…",
    allowCreate = false,
    createLabel = "Add",
    onCreateNew,
    disabled = false,
    className = "",
    inputId,
}: ComboSelectProps) {
    const uid = useId();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selectedOptions = options.filter((o) => value.includes(o.id));
    // Free-text selected items (ids not in options list)
    const freeTextSelected = value.filter((id) => !options.find((o) => o.id === id));

    const filtered = options.filter(
        (o) =>
            !value.includes(o.id) &&
            o.label.toLowerCase().includes(query.toLowerCase())
    );

    const exactMatch = options.some((o) => o.label.toLowerCase() === query.toLowerCase());

    const select = (id: string) => {
        if (multi) {
            onChange([...value, id]);
        } else {
            onChange([id]);
        }
        setQuery("");
        if (!multi) setOpen(false);
        inputRef.current?.focus();
    };

    const deselect = (id: string) => onChange(value.filter((v) => v !== id));

    const handleCreate = () => {
        const trimmed = query.trim();
        if (!trimmed) return;
        if (onCreateNew) {
            onCreateNew(trimmed);
        } else {
            // Add free-text id directly
            if (!value.includes(trimmed)) {
                onChange(multi ? [...value, trimmed] : [trimmed]);
            }
        }
        setQuery("");
        if (!multi) setOpen(false);
    };

    const inputClass =
        "flex-1 min-w-[80px] px-2 py-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none";

    const chipClass =
        "inline-flex items-center gap-1 bg-primary-50 text-primary-800 border border-primary-100 text-xs font-medium px-2 py-0.5 rounded-full";

    return (
        <div ref={containerRef} className={`relative ${className}`} id={uid}>
            {/* Input area + selected chips */}
            <div
                role="presentation"
                className={`flex flex-wrap gap-1.5 items-center min-h-[40px] px-2.5 py-1.5 bg-gray-50 border rounded-lg cursor-text transition-colors ${open ? "border-primary-400 ring-1 ring-primary-100" : "border-gray-200 hover:border-gray-300"
                    } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => { setOpen(true); inputRef.current?.focus(); }}
            >
                {/* Selected chips */}
                {selectedOptions.map((o) => (
                    <span key={o.id} className={chipClass}>
                        {o.label}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deselect(o.id); }}
                            className="text-primary-400 hover:text-primary-700 leading-none ml-0.5"
                            aria-label={`Remove ${o.label}`}
                        >
                            ×
                        </button>
                    </span>
                ))}
                {/* Free-text chips */}
                {freeTextSelected.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-100 text-xs font-medium px-2 py-0.5 rounded-full">
                        {id}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deselect(id); }}
                            className="text-amber-400 hover:text-amber-700 leading-none ml-0.5"
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    id={inputId}
                    type="text"
                    className={inputClass}
                    placeholder={value.length === 0 ? placeholder : ""}
                    value={query}
                    disabled={disabled}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") { setOpen(false); setQuery(""); }
                        if (e.key === "Backspace" && query === "" && value.length > 0) {
                            deselect(value[value.length - 1]);
                        }
                        if (e.key === "Enter") {
                            e.preventDefault();
                            if (filtered.length > 0) select(filtered[0].id);
                            else if (allowCreate && query.trim()) handleCreate();
                        }
                    }}
                />
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filtered.length === 0 && !query && (
                        <p className="px-4 py-3 text-sm text-gray-400">Start typing to search…</p>
                    )}
                    {filtered.map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-800 transition-colors"
                            onMouseDown={(e) => { e.preventDefault(); select(o.id); }}
                        >
                            {o.label}
                        </button>
                    ))}
                    {/* Create new option */}
                    {allowCreate && query.trim() && !exactMatch && filtered.length < options.length && (
                        <button
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 border-t border-gray-100 flex items-center gap-2"
                            onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
                        >
                            <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">+</span>
                            {createLabel} &ldquo;{query.trim()}&rdquo;
                        </button>
                    )}
                    {/* "Create new partner" action (no free-text, always at bottom) */}
                    {onCreateNew && query.trim() === "" && (
                        <button
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 border-t border-gray-100 flex items-center gap-2"
                            onMouseDown={(e) => { e.preventDefault(); onCreateNew(""); }}
                        >
                            <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">+</span>
                            {createLabel}
                        </button>
                    )}
                    {/* Create new via button when query matches nothing */}
                    {onCreateNew && query.trim() !== "" && filtered.length === 0 && (
                        <button
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 border-t border-gray-100 flex items-center gap-2"
                            onMouseDown={(e) => { e.preventDefault(); onCreateNew(query.trim()); }}
                        >
                            <span className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0">+</span>
                            {createLabel} &ldquo;{query.trim()}&rdquo;
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
