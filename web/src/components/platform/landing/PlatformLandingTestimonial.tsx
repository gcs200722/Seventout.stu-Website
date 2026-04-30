import Image from "next/image";
import { landingImages } from "./data";

export function PlatformLandingTestimonial() {
  return (
    <section className="bg-zinc-900 py-28 text-white">
      <div className="mx-auto max-w-4xl px-6 text-center md:px-16">
        <div className="reveal">
          <blockquote className="mb-10 text-3xl italic leading-snug">
            &quot;Atelier giup toi tap trung vao thiet ke thay vi loay hoay voi website. Chua bao gio
            viec dua thuong hieu len truc tuyen lai thanh lich va de dang den the.&quot;
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <Image
              src={landingImages.founder}
              alt="Founder"
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover"
            />
            <div className="text-left">
              <p className="font-semibold">Mai Chi</p>
              <p className="text-sm text-zinc-300">Founder, LINEN & CO.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
