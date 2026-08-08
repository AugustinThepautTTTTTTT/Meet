import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArticleContent,
  type ArticleBlock,
} from "@/app/components/article-content";
import { getLawyerDb } from "@/lib/database";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sql = getLawyerDb();
  const [article] =
    await sql`SELECT p.*,l.name,l.slug AS lawyer_slug,l.specialty,l.profile_photo_url,l.initials,l.accent FROM posts p JOIN lawyers l ON l.id=p.lawyer_id WHERE p.slug=${slug} AND p.published=true AND l.published=true`;
  if (!article) notFound();
  const blocks = (
    Array.isArray(article.content) && article.content.length
      ? article.content
      : [{ id: "legacy", type: "paragraph", text: article.body }]
  ) as ArticleBlock[];
  return (
    <main className={`published-article theme-${article.theme}`}>
      <header className="simple-header">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span>
          <span>meet</span>
        </Link>
        <Link href={`/lawyers/${article.lawyer_slug}`}>
          View lawyer profile
        </Link>
      </header>
      <article>
        <div className="article-masthead">
          <p className="section-kicker">Legal insight · {article.specialty}</p>
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
          <Link
            className="article-author"
            href={`/lawyers/${article.lawyer_slug}`}
          >
            {article.profile_photo_url ? (
              <Image
                src={article.profile_photo_url}
                alt={article.name}
                width={48}
                height={48}
                unoptimized
              />
            ) : (
              <span className={`avatar ${article.accent}`}>
                {article.initials}
              </span>
            )}
            <span>
              <strong>{article.name}</strong>
              <small>
                Published{" "}
                {new Date(article.updated_at).toLocaleDateString("en", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </small>
            </span>
          </Link>
        </div>
        {article.cover_image_url ? (
          <div className="published-cover">
            <div className="published-cover-frame">
              <Image
                src={article.cover_image_url}
                alt=""
                fill
                sizes="100vw"
                style={{
                  objectPosition: `50% ${article.cover_settings?.position ?? 50}%`,
                  transform: `scale(${(article.cover_settings?.zoom ?? 100) / 100})`,
                }}
                unoptimized
              />
            </div>
          </div>
        ) : null}
        <ArticleContent blocks={blocks} />
        {article.author_note ? (
          <div className="author-note">
            <strong>A note from {article.name.split(" ")[0]}</strong>
            <p>{article.author_note}</p>
          </div>
        ) : null}
      </article>
    </main>
  );
}
