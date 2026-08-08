import Image from "next/image";

export type ArticleBlock = {
  id: string;
  type: "paragraph" | "heading" | "quote" | "callout" | "image";
  text: string;
  url?: string;
  caption?: string;
  width?: "small" | "medium" | "wide" | "full";
  align?: "left" | "center" | "right";
  aspect?: "auto" | "square" | "landscape" | "portrait";
  position?: number;
};

export function ArticleContent({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="article-content">
      {blocks.map((block) => {
        if (block.type === "heading")
          return <h2 key={block.id}>{block.text}</h2>;
        if (block.type === "quote")
          return <blockquote key={block.id}>{block.text}</blockquote>;
        if (block.type === "callout")
          return (
            <aside key={block.id}>
              <strong>Key point</strong>
              <p>{block.text}</p>
            </aside>
          );
        if (block.type === "image" && block.url)
          return (
            <figure
              key={block.id}
              className={`image-${block.width || "wide"} align-${block.align || "center"} aspect-${block.aspect || "auto"}`}
            >
              <div className="article-image-frame">
                <Image
                  src={block.url}
                  alt={block.caption || "Article illustration"}
                  fill
                  sizes="(max-width: 800px) 100vw, 1000px"
                  style={{ objectPosition: `50% ${block.position ?? 50}%` }}
                  unoptimized
                />
              </div>
              <figcaption>{block.caption}</figcaption>
            </figure>
          );
        return <p key={block.id}>{block.text}</p>;
      })}
    </div>
  );
}
