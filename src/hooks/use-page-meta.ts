import { useEffect } from "react";

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title;
    if (!description) return;
    const name = "description";
    let el = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", description);
  }, [title, description]);
}
