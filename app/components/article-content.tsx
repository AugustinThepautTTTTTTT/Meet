import Image from "next/image";

export type ArticleBlock = {
  id: string;
  type: "paragraph" | "heading" | "quote" | "callout" | "image";
  text: string;
  url?: string;
  caption?: string;
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
            <figure key={block.id}>
              <Image
                src={block.url}
                alt={block.caption || "Article illustration"}
                width={1200}
                height={760}
                sizes="(max-width: 800px) 100vw, 760px"
                unoptimized
              />
              <figcaption>{block.caption}</figcaption>
            </figure>
          );
        return <p key={block.id}>{block.text}</p>;
      })}
    </div>
  );
}
