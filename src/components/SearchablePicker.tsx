import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  title?: string;
  allowCustom?: boolean;
  className?: string;
};

export function SearchablePicker({
  value,
  onChange,
  options,
  placeholder = "Select…",
  title = "Select",
  allowCustom = true,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
        className={
          className ??
          "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-indigo-500"
        }
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 overflow-hidden max-w-sm">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <Command shouldFilter>
            <CommandInput
              placeholder={`Search ${title.toLowerCase()}…`}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-[60vh]">
              <CommandEmpty>
                {allowCustom && query.trim() ? (
                  <button
                    type="button"
                    className="text-sm text-indigo-600 font-medium"
                    onClick={() => {
                      onChange(query.trim());
                      setOpen(false);
                    }}
                  >
                    Use "{query.trim()}"
                  </button>
                ) : (
                  "No results found."
                )}
              </CommandEmpty>
              {options.map((o) => (
                <CommandItem
                  key={o}
                  value={o}
                  onSelect={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                >
                  {o}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
