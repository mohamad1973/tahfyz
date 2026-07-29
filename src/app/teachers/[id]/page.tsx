import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ProfileBooking } from "@/components/profile-booking";
import { getTeacher } from "@/lib/store";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const teacher = await getTeacher(id);
  return { title: teacher?.name || "Teacher" };
}

export default async function TeacherProfilePage({ params }: Props) {
  const { id } = await params;
  const teacher = await getTeacher(id);
  if (!teacher || !teacher.active) notFound();

  const hasMedia =
    (teacher.videos?.length ?? 0) > 0 || (teacher.audios?.length ?? 0) > 0;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <Link
          href="/teachers"
          className="text-sm font-semibold text-olive underline"
        >
          ← All teachers
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-bg-deep shadow-lg">
              <Image
                src={teacher.photoUrl}
                alt={teacher.name}
                fill
                className="object-cover object-top"
                priority
                sizes="320px"
              />
            </div>
            <div>
              <h1 className="font-display text-3xl text-olive-deep">
                {teacher.name}
              </h1>
              <p className="mt-1 text-lg text-ink-muted">{teacher.nameAr}</p>
            </div>
            <ul className="flex flex-wrap gap-2">
              <li className="rounded-full bg-olive px-3 py-1 text-xs font-semibold text-card">
                ${teacher.priceUsd}/hr
              </li>
              {teacher.subjects.map((s) => (
                <li
                  key={s}
                  className="rounded-full bg-bg-deep px-3 py-1 text-xs font-semibold text-ink"
                >
                  {s}
                </li>
              ))}
            </ul>
            <nav className="flex flex-wrap gap-2 border-t border-line pt-4 text-sm font-semibold">
              <a
                href="#about"
                className="rounded-full bg-bg-deep px-3 py-1.5 text-ink hover:bg-olive hover:text-card"
              >
                About
              </a>
              {hasMedia && (
                <a
                  href="#media"
                  className="rounded-full bg-bg-deep px-3 py-1.5 text-ink hover:bg-olive hover:text-card"
                >
                  Media
                </a>
              )}
              <a
                href="#book"
                className="rounded-full bg-olive px-3 py-1.5 text-card hover:bg-olive-deep"
              >
                Book
              </a>
            </nav>
          </aside>

          <div className="space-y-10">
            <section id="about" className="scroll-mt-28">
              <h2 className="font-display text-2xl text-ink">About</h2>
              <p className="mt-3 leading-relaxed text-ink-muted">{teacher.bio}</p>
              <p
                dir="rtl"
                className="mt-4 rounded-xl bg-bg-deep/50 p-4 text-right leading-relaxed text-ink"
              >
                {teacher.bioAr}
              </p>
            </section>

            {hasMedia && (
              <section id="media" className="scroll-mt-28 space-y-6">
                {teacher.videos?.length > 0 && (
                  <div>
                    <h2 className="font-display text-2xl text-ink">Videos</h2>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {teacher.videos.map((v) => (
                        <figure
                          key={v.id}
                          className="overflow-hidden rounded-xl border border-line bg-card"
                        >
                          <video
                            controls
                            className="aspect-video w-full bg-ink"
                            src={v.url}
                          />
                          <figcaption className="px-3 py-2 text-sm font-medium">
                            {v.title}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
                {teacher.audios?.length > 0 && (
                  <div>
                    <h2 className="font-display text-2xl text-ink">Audio</h2>
                    <ul className="mt-3 space-y-3">
                      {teacher.audios.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-xl border border-line bg-card px-4 py-3"
                        >
                          <p className="mb-2 text-sm font-medium">{a.title}</p>
                          <audio controls className="w-full" src={a.url} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <section id="book" className="scroll-mt-28">
              <h2 className="font-display text-2xl text-ink">Book a lesson</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Tap an open hour on the calendar. After payment confirmation,
                the square becomes fully booked.
              </p>
              <div className="mt-4">
                <ProfileBooking teacher={teacher} />
              </div>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
