"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArticleContent,
  type ArticleBlock,
} from "@/app/components/article-content";
import MediaUpload from "./media-upload";

export type ArticleDraft = {
  id?: string;
  slug?: string;
  title: string;
  excerpt: string;
  body: string;
  cover_image_url: string;
  cover_settings: { position: number; zoom: number };
  content: ArticleBlock[];
  theme: string;
  author_note: string;
  published: boolean;
  updated_at?: string;
};
export const blankArticle: ArticleDraft = {
  title: "",
  excerpt: "",
  body: "",
  cover_image_url: "",
  cover_settings: { position: 50, zoom: 100 },
  content: [],
  theme: "editorial",
  author_note: "",
  published: false,
};
const blockLabels = {
  paragraph: "Text",
  heading: "Heading",
  quote: "Quote",
  callout: "Callout",
  image: "Image",
};

export default function ArticleStudio({
  article,
  setArticle,
  articles,
  onSave,
}: {
  article: ArticleDraft;
  setArticle: (article: ArticleDraft) => void;
  articles: ArticleDraft[];
  onSave: (publish: boolean) => Promise<void>;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  function add(type: ArticleBlock["type"]) {
    setArticle({
      ...article,
      content: [
        ...article.content,
        {
          id: crypto.randomUUID(),
          type,
          text: "",
          url: "",
          caption: "",
          width: "wide",
          align: "center",
          aspect: "auto",
          position: 50,
        },
      ],
    });
  }
  function patch(id: string, values: Partial<ArticleBlock>) {
    setArticle({
      ...article,
      content: article.content.map((block) =>
        block.id === id ? { ...block, ...values } : block,
      ),
    });
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= article.content.length) return;
    const blocks = [...article.content];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    setArticle({ ...article, content: blocks });
  }
  function remove(id: string) {
    setArticle({
      ...article,
      content: article.content.filter((block) => block.id !== id),
    });
  }
  async function uploadBlock(id: string, file: File) {
    const form = new FormData();
    form.set("file", file);
    form.set("purpose", "article");
    const response = await fetch("/api/uploads", {
      method: "POST",
      body: form,
    });
    const data = await response.json();
    if (response.ok) patch(id, { url: data.url });
  }
  return (
    <div className="wordpress-studio">
      <aside className="article-library">
        <div>
          <p className="section-kicker">Your library</p>
          <button
            className="new-article"
            onClick={() => setArticle({ ...blankArticle })}
          >
            + New
          </button>
        </div>
        {articles.map((item) => (
          <button
            className={item.id === article.id ? "selected" : ""}
            key={item.id}
            onClick={() => setArticle({ ...item, content: item.content || [] })}
          >
            <span>{item.published ? "Published" : "Draft"}</span>
            <strong>{item.title}</strong>
            <small>
              {item.updated_at
                ? new Date(item.updated_at).toLocaleDateString()
                : ""}
            </small>
          </button>
        ))}
      </aside>
      <section className="page-builder">
        <div className="builder-toolbar">
          <div>
            <button
              className={mode === "edit" ? "active" : ""}
              onClick={() => setMode("edit")}
            >
              Edit
            </button>
            <button
              className={mode === "preview" ? "active" : ""}
              onClick={() => setMode("preview")}
            >
              Preview
            </button>
          </div>
          <div className="theme-picker">
            <span>Style</span>
            {["editorial", "modern", "serif"].map((theme) => (
              <button
                aria-label={`${theme} theme`}
                className={article.theme === theme ? "active" : theme}
                key={theme}
                onClick={() => setArticle({ ...article, theme })}
              />
            ))}
          </div>
        </div>
        {mode === "preview" ? (
          <ArticlePreview article={article} />
        ) : (
          <>
            <div className="story-settings">
              <MediaUpload
                label="Article cover"
                purpose="article-cover"
                value={article.cover_image_url}
                onChange={(url) =>
                  setArticle({ ...article, cover_image_url: url })
                }
                settings={article.cover_settings || { position: 50, zoom: 100 }}
                onSettings={(cover_settings) =>
                  setArticle({ ...article, cover_settings })
                }
              />
              <label>
                Article title
                <input
                  value={article.title}
                  onChange={(e) =>
                    setArticle({ ...article, title: e.target.value })
                  }
                  placeholder="Write a useful, specific headline"
                />
              </label>
              <label>
                Standfirst
                <textarea
                  rows={3}
                  value={article.excerpt}
                  onChange={(e) =>
                    setArticle({ ...article, excerpt: e.target.value })
                  }
                  placeholder="A short introduction that draws the reader in."
                />
              </label>
            </div>
            <div className="block-canvas">
              {article.content.length ? (
                article.content.map((block, index) => (
                  <div className={`content-block ${block.type}`} key={block.id}>
                    <div className="block-controls">
                      <span>{blockLabels[block.type]}</span>
                      <button
                        onClick={() => move(index, -1)}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => remove(block.id)}
                        aria-label="Delete block"
                      >
                        ×
                      </button>
                    </div>
                    {block.type === "image" ? (
                      <>
                        <div className="inline-image-upload">
                          {block.url ? (
                            <Image
                              src={block.url}
                              alt=""
                              width={900}
                              height={560}
                              unoptimized
                            />
                          ) : (
                            <span>Add an image to this section</span>
                          )}
                          <label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void uploadBlock(block.id, file);
                              }}
                            />
                            Choose image
                          </label>
                        </div>
                        <input
                          value={block.caption || ""}
                          onChange={(e) =>
                            patch(block.id, { caption: e.target.value })
                          }
                          placeholder="Image caption"
                        />
                        <div className="image-design-controls">
                          <label>
                            Size
                            <select
                              value={block.width || "wide"}
                              onChange={(e) =>
                                patch(block.id, {
                                  width: e.target
                                    .value as ArticleBlock["width"],
                                })
                              }
                            >
                              <option value="small">Small</option>
                              <option value="medium">Medium</option>
                              <option value="wide">Wide</option>
                              <option value="full">Full width</option>
                            </select>
                          </label>
                          <label>
                            Align
                            <select
                              value={block.align || "center"}
                              onChange={(e) =>
                                patch(block.id, {
                                  align: e.target
                                    .value as ArticleBlock["align"],
                                })
                              }
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </label>
                          <label>
                            Shape
                            <select
                              value={block.aspect || "auto"}
                              onChange={(e) =>
                                patch(block.id, {
                                  aspect: e.target
                                    .value as ArticleBlock["aspect"],
                                })
                              }
                            >
                              <option value="auto">Original</option>
                              <option value="landscape">Landscape</option>
                              <option value="square">Square</option>
                              <option value="portrait">Portrait</option>
                            </select>
                          </label>
                          <label>
                            Focal point
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={block.position ?? 50}
                              onChange={(e) =>
                                patch(block.id, {
                                  position: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                      </>
                    ) : block.type === "heading" ? (
                      <input
                        value={block.text}
                        onChange={(e) =>
                          patch(block.id, { text: e.target.value })
                        }
                        placeholder="Section heading"
                      />
                    ) : (
                      <textarea
                        rows={block.type === "paragraph" ? 6 : 3}
                        value={block.text}
                        onChange={(e) =>
                          patch(block.id, { text: e.target.value })
                        }
                        placeholder={
                          block.type === "quote"
                            ? "A memorable quotation…"
                            : block.type === "callout"
                              ? "The essential point readers should remember…"
                              : "Start writing…"
                        }
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-canvas">
                  <strong>Build your story, block by block.</strong>
                  <p>
                    Add text, headings, images, quotations and highlighted
                    advice.
                  </p>
                </div>
              )}
            </div>
            <div className="block-inserter">
              <span>Add block</span>
              {(Object.keys(blockLabels) as ArticleBlock["type"][]).map(
                (type) => (
                  <button key={type} onClick={() => add(type)}>
                    + {blockLabels[type]}
                  </button>
                ),
              )}
            </div>
            <label className="author-note-field">
              Author note
              <textarea
                rows={3}
                value={article.author_note}
                onChange={(e) =>
                  setArticle({ ...article, author_note: e.target.value })
                }
                placeholder="Optional personal note or disclaimer at the end of the article."
              />
            </label>
          </>
        )}
        <div className="builder-actions">
          <button className="card-button" onClick={() => onSave(false)}>
            Save draft
          </button>
          <button
            className="primary-button compact"
            onClick={() => onSave(true)}
          >
            {article.published ? "Update article" : "Publish article"}
            <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function ArticlePreview({ article }: { article: ArticleDraft }) {
  return (
    <div className={`builder-preview theme-${article.theme}`}>
      <p className="section-kicker">Legal insight</p>
      <h1>{article.title || "Your article title"}</h1>
      <p className="preview-excerpt">
        {article.excerpt || "Your article introduction will appear here."}
      </p>
      {article.cover_image_url ? (
        <div className="preview-article-cover">
          <Image
            src={article.cover_image_url}
            alt=""
            fill
            style={{
              objectPosition: `50% ${article.cover_settings?.position ?? 50}%`,
              transform: `scale(${(article.cover_settings?.zoom ?? 100) / 100})`,
            }}
            unoptimized
          />
        </div>
      ) : null}
      <ArticleContent blocks={article.content} />
      {article.author_note ? (
        <div className="author-note">
          <strong>Author note</strong>
          <p>{article.author_note}</p>
        </div>
      ) : null}
    </div>
  );
}
