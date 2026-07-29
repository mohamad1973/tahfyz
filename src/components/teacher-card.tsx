import Image from "next/image";
import Link from "next/link";
import type { Teacher } from "@/lib/types";

export function TeacherCard({ teacher }: { teacher: Teacher }) {
  return (
    <Link
      href={`/teachers/${teacher.id}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-card shadow-[0_12px_40px_-24px_rgba(26,46,40,0.45)] transition duration-300 hover:-translate-y-1 hover:border-olive/40 hover:shadow-[0_20px_50px_-20px_rgba(26,46,40,0.5)]"
    >
      <article>
        <div className="relative aspect-[4/5] overflow-hidden bg-bg-deep">
          <Image
            src={teacher.photoUrl}
            alt={teacher.name}
            fill
            className="object-cover object-top transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent p-4 pt-20">
            <h3 className="font-display text-xl font-semibold text-card">
              {teacher.name}
            </h3>
            <p className="text-sm text-sand-soft">{teacher.nameAr}</p>
            <p className="mt-1 text-sm font-semibold text-card">
              ${teacher.priceUsd ?? 25}/hr
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-sand-soft/90 opacity-0 transition group-hover:opacity-100">
              View profile →
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}

export function TeachersGrid({ teachers }: { teachers: Teacher[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {teachers.map((t) => (
        <TeacherCard key={t.id} teacher={t} />
      ))}
    </div>
  );
}
