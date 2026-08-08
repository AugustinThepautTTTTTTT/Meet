import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLawyerDb } from "@/lib/database";

export default async function LawyerPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sql = getLawyerDb();
  const [lawyer] =
    await sql`SELECT * FROM lawyers WHERE slug=${slug} AND published=true`;
  if (!lawyer) notFound();
  const articles =
    await sql`SELECT slug,title,excerpt,cover_image_url,theme,updated_at FROM posts WHERE lawyer_id=${lawyer.id} AND published=true ORDER BY updated_at DESC`;
  return (
    <main className="profile-page">
      <header className="simple-header">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span>
          <span>meet</span>
        </Link>
        <Link href="/">Find a lawyer</Link>
      </header>
      <div className="profile-cover">
        {lawyer.cover_photo_url ? (
          <Image
            src={lawyer.cover_photo_url}
            alt=""
            fill
            sizes="100vw"
            style={{
              objectPosition: `50% ${lawyer.cover_settings?.position ?? 50}%`,
              transform: `scale(${(lawyer.cover_settings?.zoom ?? 100) / 100})`,
            }}
            unoptimized
          />
        ) : (
          <div />
        )}
      </div>
      <section className="extended-profile">
        <div className="extended-identity">
          {lawyer.profile_photo_url ? (
            <Image
              className="profile-photo"
              src={lawyer.profile_photo_url}
              alt={lawyer.name}
              width={150}
              height={150}
              style={{
                objectPosition: `50% ${lawyer.photo_settings?.position ?? 50}%`,
                transform: `scale(${(lawyer.photo_settings?.zoom ?? 100) / 100})`,
              }}
              unoptimized
            />
          ) : (
            <div className={`avatar ${lawyer.accent} profile-photo`}>
              {lawyer.initials}
            </div>
          )}
          <div>
            <span className="verified">✓ Published profile</span>
            <h1>{lawyer.name}</h1>
            <p className="profile-title">{lawyer.specialty}</p>
            <p className="location">
              {lawyer.firm_name ? `${lawyer.firm_name} · ` : ""}
              {lawyer.location} · {lawyer.languages}
            </p>
          </div>
        </div>
        <div className="profile-page-grid">
          <article>
            <p className="profile-tagline">
              {lawyer.tagline || "Clear advice, built around your situation."}
            </p>
            <p className="long-bio">{lawyer.bio}</p>
            <section className="profile-detail-section">
              <p className="section-kicker">Expertise</p>
              <div className="expertise-grid">
                {lawyer.tags.map((tag: string, i: number) => (
                  <div key={tag}>
                    <span>0{i + 1}</span>
                    <strong>{tag}</strong>
                    <small>
                      {lawyer.reasons[i % Math.max(lawyer.reasons.length, 1)] ||
                        "Focused legal guidance"}
                    </small>
                  </div>
                ))}
              </div>
            </section>
            {lawyer.services?.length ? (
              <section className="profile-detail-section">
                <p className="section-kicker">Services</p>
                <div className="service-list">
                  {lawyer.services.map((service: string) => (
                    <span key={service}>{service}</span>
                  ))}
                </div>
              </section>
            ) : null}
            <section className="profile-detail-section">
              <p className="section-kicker">Background</p>
              <div className="background-grid">
                <div>
                  <small>Experience</small>
                  <strong>{lawyer.experience}</strong>
                </div>
                <div>
                  <small>Credentials</small>
                  <strong>{lawyer.credentials}</strong>
                </div>
                <div>
                  <small>Education</small>
                  <strong>{lawyer.education || "Available on request"}</strong>
                </div>
              </div>
              {lawyer.awards?.length ? (
                <ul className="awards-list">
                  {lawyer.awards.map((award: string) => (
                    <li key={award}>✦ {award}</li>
                  ))}
                </ul>
              ) : null}
            </section>
            <section className="profile-detail-section">
              <p className="section-kicker">Latest insights</p>
              <div className="public-articles">
                {articles.map((article) => (
                  <Link href={`/articles/${article.slug}`} key={article.slug}>
                    {article.cover_image_url ? (
                      <Image
                        src={article.cover_image_url}
                        alt=""
                        width={500}
                        height={280}
                        unoptimized
                      />
                    ) : (
                      <div />
                    )}
                    <small>{lawyer.practice} · Insight</small>
                    <h2>{article.title}</h2>
                    <p>{article.excerpt}</p>
                    <span>Read article →</span>
                  </Link>
                ))}
              </div>
            </section>
          </article>
          <aside className="profile-contact-card">
            <h3>Work with {lawyer.name.split(" ")[0]}</h3>
            <div>
              <small>Consultation</small>
              <strong>{lawyer.price}</strong>
            </div>
            <div>
              <small>Availability</small>
              <strong className="green">{lawyer.availability}</strong>
            </div>
            <div>
              <small>Format</small>
              <strong>{lawyer.consultation_format}</strong>
            </div>
            {lawyer.website ? (
              <a
                className="card-button"
                href={lawyer.website}
                target="_blank"
                rel="noreferrer"
              >
                Visit website
              </a>
            ) : null}
            <Link className="primary-button profile-contact-link" href="/#top">
              Request an introduction <span>→</span>
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
